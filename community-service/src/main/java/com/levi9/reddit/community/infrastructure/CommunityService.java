package com.levi9.reddit.community.infrastructure;

import com.levi9.reddit.community.contracts.CommunityResponse;
import com.levi9.reddit.community.infrastructure.repository.CommunityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CommunityService {
    private final CommunityRepository communities;

    public CommunityService(CommunityRepository communities) {
        this.communities = communities;
    }

    @Transactional(readOnly = true)
    public List<CommunityResponse> getAll() {
        return communities.findByActiveTrueOrderByNameAsc().stream()
                .map(community -> new CommunityResponse(
                        community.getId(),
                        community.getName(),
                        community.getMemberCount()))
                .toList();
    }
}
