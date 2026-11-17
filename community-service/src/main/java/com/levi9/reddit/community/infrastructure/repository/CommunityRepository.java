package com.levi9.reddit.community.infrastructure.repository;

import com.levi9.reddit.community.core.model.Community;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityRepository extends JpaRepository<Community, Long> {
    // Inactive communities stay in the database but never show up in public reads.

    Page<Community> findByActiveTrue(Pageable pageable);

    Optional<Community> findByNameIgnoreCaseAndActiveTrue(String name);
}
