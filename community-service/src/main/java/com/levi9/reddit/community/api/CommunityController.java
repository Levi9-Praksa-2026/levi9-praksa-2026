package com.levi9.reddit.community.api;

import com.levi9.reddit.community.contracts.CommunityDetailResponse;
import com.levi9.reddit.community.contracts.CommunityResponse;
import com.levi9.reddit.community.contracts.CommunitySort;
import com.levi9.reddit.community.contracts.PageResponse;
import com.levi9.reddit.community.infrastructure.CommunityMembershipService;
import com.levi9.reddit.community.infrastructure.CommunityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Locale;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/communities")
@Tag(name = "Communities")
public class CommunityController {
    private final CommunityService communityService;
    private final CommunityMembershipService membershipService;

    public CommunityController(CommunityService communityService, CommunityMembershipService membershipService) {
        this.communityService = communityService;
        this.membershipService = membershipService;
    }

    @GetMapping
    @Operation(summary = "Active communities, paginated; each item has only its name and member count")
    public PageResponse<CommunityResponse> findCommunities(
            @RequestParam(defaultValue = "new")
            @Pattern(regexp = "(?i)new|top", message = "sort must be new or top") String sort,
            @RequestParam(required = false) @Size(max = 50) String name,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return communityService.findCommunities(
                CommunitySort.valueOf(sort.toUpperCase(Locale.ROOT)), name, page, size);
    }

    @GetMapping("/{name}")
    @Operation(summary = "A single community with all its details; 404 if it doesn't exist or is inactive")
    public CommunityDetailResponse getCommunity(@PathVariable @Size(max = 50) String name) {
        return communityService.getCommunity(name);
    }

    @PutMapping("/{name}/members/me")
    @Operation(summary = "Join a community; calling it twice is harmless")
    public ResponseEntity<Void> join(@PathVariable @Size(max = 50) String name,
                                     @AuthenticationPrincipal Jwt jwt) {
        membershipService.join(name, Long.parseLong(jwt.getSubject()));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{name}/members/me")
    @Operation(summary = "Leave a community; leaving when not a member is harmless")
    public ResponseEntity<Void> leave(@PathVariable @Size(max = 50) String name,
                                      @AuthenticationPrincipal Jwt jwt) {
        membershipService.leave(name, Long.parseLong(jwt.getSubject()));
        return ResponseEntity.noContent().build();
    }
}
