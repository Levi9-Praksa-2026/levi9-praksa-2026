package com.levi9.reddit.community.api;

import com.levi9.reddit.community.contracts.CommunityDetailResponse;
import com.levi9.reddit.community.contracts.CommunityResponse;
import com.levi9.reddit.community.contracts.CommunitySort;
import com.levi9.reddit.community.contracts.CreateCommunityRequest;
import com.levi9.reddit.community.contracts.PageResponse;
import com.levi9.reddit.community.contracts.UpdateCommunityRequest;
import com.levi9.reddit.community.infrastructure.CommunityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/communities")
@Tag(name = "Communities")
public class CommunityController {
    private final CommunityService communityService;

    public CommunityController(CommunityService communityService) {
        this.communityService = communityService;
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a community (ADMIN)")
    public CommunityDetailResponse create(@Valid @RequestBody CreateCommunityRequest request) {
        return communityService.create(request.name(), request.description(), MockCaller.ID);
    }

    @PatchMapping("/{name}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Edit the description of a community (ADMIN); the name never changes")
    public void updateDescription(
            @PathVariable @Pattern(regexp = "[A-Za-z0-9_-]{1,50}") String name,
            @Valid @RequestBody UpdateCommunityRequest request) {
        communityService.updateDescription(name, request.description());
    }

    @DeleteMapping("/{name}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Shut down a community (ADMIN): is_active = false, no row is deleted")
    public void deactivate(@PathVariable @Pattern(regexp = "[A-Za-z0-9_-]{1,50}") String name) {
        communityService.deactivate(name);
    }

    @PostMapping("/{name}/reactivate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Undo a shutdown (ADMIN)")
    public void reactivate(@PathVariable @Pattern(regexp = "[A-Za-z0-9_-]{1,50}") String name) {
        communityService.reactivate(name);
    }
}
