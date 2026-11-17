package com.levi9.reddit.community.api;

import com.levi9.reddit.community.contracts.CommunityResponse;
import com.levi9.reddit.community.infrastructure.CommunityService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/communities")
public class CommunityController {
    private final CommunityService communityService;

    public CommunityController(CommunityService communityService) {
        this.communityService = communityService;
    }

    @GetMapping
    public List<CommunityResponse> getAll() {
        return communityService.getAll();
    }
}
