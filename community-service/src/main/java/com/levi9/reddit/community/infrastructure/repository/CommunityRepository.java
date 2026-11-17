package com.levi9.reddit.community.infrastructure.repository;

import com.levi9.reddit.community.core.model.Community;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommunityRepository extends JpaRepository<Community, Long> {
    List<Community> findByActiveTrueOrderByNameAsc();
}
