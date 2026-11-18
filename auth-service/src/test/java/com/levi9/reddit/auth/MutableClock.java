package com.levi9.reddit.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

/** A clock tests can move forward, to check rules about time (expiry, grace window, rate limits) without waiting. */
public class MutableClock extends Clock {
    private volatile Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);

    public void advance(Duration duration) {
        now = now.plus(duration);
    }

    @Override
    public Instant instant() {
        return now;
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return this;
    }
}
