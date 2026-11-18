package com.levi9.reddit.community.infrastructure.repository;

import com.levi9.reddit.community.core.model.Community;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommunityRepository extends JpaRepository<Community, Long> {
    // Inactive communities stay in the database but never show up in public reads.

    Page<Community> findByActiveTrue(Pageable pageable);

    @Query("select c from Community c where lower(c.name) = lower(:name) and c.active = true")
    Optional<Community> findActiveByName(@Param("name") String name);

    /** Includes inactive communities so admins can edit, shut down or reactivate them. */
    @Query("select c from Community c where lower(c.name) = lower(:name)")
    Optional<Community> findByName(@Param("name") String name);
}
