package com.levi9.reddit.community.infrastructure.repository;

import com.levi9.reddit.community.core.model.CommunityMember;
import com.levi9.reddit.community.core.model.CommunityMemberId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityMemberRepository extends JpaRepository<CommunityMember, CommunityMemberId> {}
