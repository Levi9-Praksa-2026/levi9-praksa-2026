package com.levi9.reddit.community.infrastructure.repository;

import com.levi9.reddit.community.core.model.Community;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommunityRepository extends JpaRepository<Community, Long> {
    // Inactive communities stay in the database but never show up in public reads.

    Page<Community> findByActiveTrue(Pageable pageable);

    Page<Community> findByActiveTrueAndNameContainingIgnoreCase(String name, Pageable pageable);

    @Query("select c from Community c where lower(c.name) = lower(:name) and c.active = true")
    Optional<Community> findActiveByName(@Param("name") String name);

    /**
     * Locks the community row so two joins or leaves cannot read the same member_count and both write it.
     * Only for use inside a transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Community c where lower(c.name) = lower(:name) and c.active = true")
    Optional<Community> findActiveByNameForUpdate(@Param("name") String name);

    /**
     * Same lock, but also finds inactive communities. Needed by leave: a user must be able to leave a
     * community that was shut down, otherwise the membership row stays forever.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Community c where lower(c.name) = lower(:name)")
    Optional<Community> findByNameForUpdate(@Param("name") String name);
}
