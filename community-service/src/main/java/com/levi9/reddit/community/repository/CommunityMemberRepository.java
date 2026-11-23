package com.levi9.reddit.community.repository;

import com.levi9.reddit.community.entity.CommunityMember;
import com.levi9.reddit.community.entity.CommunityMemberId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityMemberRepository extends JpaRepository<CommunityMember, CommunityMemberId> {}
