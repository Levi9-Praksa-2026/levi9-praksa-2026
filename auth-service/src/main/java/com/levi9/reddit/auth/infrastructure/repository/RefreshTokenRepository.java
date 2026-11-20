package com.levi9.reddit.auth.infrastructure.repository;

import com.levi9.reddit.auth.core.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Revokes the token only if it is still active, in one statement. Returns 1 when this caller won the
     * rotation and 0 when the token was already revoked or has expired. Two refreshes racing with the same
     * token can't both get 1: Postgres locks the row, and the second update re-checks {@code revoked_at}
     * after the first commits.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update RefreshToken t set t.revokedAt = :now
            where t.tokenHash = :tokenHash and t.revokedAt is null and t.expiresAt > :now
            """)
    int revokeIfActive(@Param("tokenHash") String tokenHash, @Param("now") Instant now);

    @Modifying
    @Query("update RefreshToken t set t.revokedAt = :at where t.userId = :userId and t.revokedAt is null")
    int revokeAllActiveByUserId(@Param("userId") Long userId, @Param("at") Instant at);
}
