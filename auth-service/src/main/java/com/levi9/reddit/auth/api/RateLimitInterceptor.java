package com.levi9.reddit.auth.api;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.levi9.reddit.auth.core.exception.TooManyRequestsException;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.TimeMeter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Limits how often one client IP may call an endpoint, so nobody can guess passwords or check many emails quickly.
 * Runs before the request body is read and validated: a blocked request costs no BCrypt, and invalid requests count.
 * <p>
 * The client is {@code request.getRemoteAddr()}. Behind the gateway that would be the gateway itself, so
 * {@code server.forward-headers-strategy: native} makes Tomcat set it from {@code X-Forwarded-For} instead: it reads
 * the list from the right, skips private-network addresses (the gateway), and takes the first public one. Entries a
 * client adds on the left are never reached.
 * <p>
 * Buckets live in memory, so each auth-service instance counts on its own. Fine for the one instance we run.
 */
class RateLimitInterceptor implements HandlerInterceptor {
    /** Memory bound. If an attacker uses more IPs than this, the oldest buckets are dropped and start full again. */
    private static final long MAX_TRACKED_CLIENTS = 100_000;

    private final Bandwidth bandwidth;
    private final TimeMeter time;
    private final Cache<String, Bucket> buckets;

    RateLimitInterceptor(RateLimitProperties.Limit limit, Clock clock) {
        this.bandwidth = Bandwidth.builder()
                .capacity(limit.requests())
                .refillGreedy(limit.requests(), limit.per())
                .build();
        this.time = new ClockTimeMeter(clock);
        // A bucket nobody used for a whole period has refilled completely, so dropping it changes nothing.
        this.buckets = Caffeine.newBuilder()
                .expireAfterAccess(limit.per())
                .maximumSize(MAX_TRACKED_CLIENTS)
                .build();
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Bucket bucket = buckets.get(request.getRemoteAddr(), client -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            // Handled like any domain error by GlobalExceptionHandler: 429 problem detail plus Retry-After.
            throw new TooManyRequestsException(Duration.ofNanos(probe.getNanosToWaitForRefill()));
        }
        return true;
    }

    private Bucket newBucket() {
        return Bucket.builder()
                .addLimit(bandwidth)
                .withCustomTimePrecision(time)
                .build();
    }

    /** Bucket4j's time source, read from the service's {@link Clock} so tests can move time instead of waiting. */
    private record ClockTimeMeter(Clock clock) implements TimeMeter {
        @Override
        public long currentTimeNanos() {
            Instant now = clock.instant();
            return now.getEpochSecond() * 1_000_000_000L + now.getNano();
        }

        @Override
        public boolean isWallClockBased() {
            return true;
        }
    }
}
