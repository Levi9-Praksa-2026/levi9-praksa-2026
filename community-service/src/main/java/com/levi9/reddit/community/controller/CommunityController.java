package com.levi9.reddit.community.controller;

import com.levi9.reddit.community.dto.CommunityDTO;
import com.levi9.reddit.community.dto.CommunityDetailDTO;
import com.levi9.reddit.community.dto.CommunitySort;
import com.levi9.reddit.community.dto.CreateCommunityDTO;
import com.levi9.reddit.community.dto.PageDTO;
import com.levi9.reddit.community.dto.UpdateCommunityDTO;
import com.levi9.reddit.community.entity.Community;
import com.levi9.reddit.community.service.CommunityMembershipService;
import com.levi9.reddit.community.service.CommunityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/communities")
@Tag(name = "Communities")
@RequiredArgsConstructor
public class CommunityController {
    private final CommunityService communityService;
    private final CommunityMembershipService membershipService;

    @GetMapping
    @Operation(summary = "Active communities, paginated; each item has only its name and member count")
    public PageDTO<CommunityDTO> findCommunities(
            @RequestParam(defaultValue = "new")
            @Pattern(regexp = "(?i)new|top", message = "sort must be new or top") String sort,
            @RequestParam(required = false) @Size(max = 50) String name,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return communityService.findCommunities(
                CommunitySort.valueOf(sort.toUpperCase(Locale.ROOT)), name, page, size);
    }

    /** The presence of {@code inactive} selects this ADMIN handler; the boolean chooses which set to list. */
    @GetMapping(params = "inactive")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "ADMIN: list communities by active/inactive state")
    public PageDTO<CommunityDTO> findCommunitiesForAdmin(
            @RequestParam(defaultValue = "false") boolean inactive,
            @RequestParam(defaultValue = "new")
            @Pattern(regexp = "(?i)new|top", message = "sort must be new or top") String sort,
            @RequestParam(required = false) @Size(max = 50) String name,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return inactive
                ? communityService.findInactiveCommunities(name, page, size)
                : communityService.findCommunities(
                        CommunitySort.valueOf(sort.toUpperCase(Locale.ROOT)), name, page, size);
    }

    private static long userId(Jwt jwt) {
        String subject = jwt.getSubject();
        assert subject != null;
        return Long.parseLong(subject);
    }

    @GetMapping("/{name}")
    @Operation(summary = "A single community with all its details; 404 if it doesn't exist or is inactive")
    public CommunityDetailDTO getCommunity(@PathVariable @Size(max = 50) String name) {
        return communityService.getCommunity(name);
    }

    @PutMapping("/{name}/members/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Join a community; calling it twice is harmless")
    public ResponseEntity<Void> join(@PathVariable @Size(max = 50) String name,
                                     @AuthenticationPrincipal Jwt jwt) {
        membershipService.join(name, userId(jwt));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{name}/members/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Leave a community; leaving when not a member is harmless")
    public ResponseEntity<Void> leave(@PathVariable @Size(max = 50) String name,
                                      @AuthenticationPrincipal Jwt jwt) {
        membershipService.leave(name, userId(jwt));
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a community (ADMIN)")
    public CommunityDetailDTO create(
            @Valid @RequestBody CreateCommunityDTO request,
            @AuthenticationPrincipal Jwt jwt) {
        return communityService.create(request.name(), request.description(), userId(jwt));
    }

    @PatchMapping("/{name}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Edit the description of a community (ADMIN); the name never changes")
    public void updateDescription(
            @PathVariable @Pattern(regexp = Community.NAME_PATTERN) String name,
            @Valid @RequestBody UpdateCommunityDTO request) {
        communityService.updateDescription(name, request.description());
    }

    @DeleteMapping("/{name}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Shut down a community (ADMIN): is_active = false, no row is deleted")
    public void deactivate(@PathVariable @Pattern(regexp = Community.NAME_PATTERN) String name) {
        communityService.deactivate(name);
    }

    @PostMapping("/{name}/reactivate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Undo a shutdown (ADMIN)")
    public void reactivate(@PathVariable @Pattern(regexp = Community.NAME_PATTERN) String name) {
        communityService.reactivate(name);
    }
}
