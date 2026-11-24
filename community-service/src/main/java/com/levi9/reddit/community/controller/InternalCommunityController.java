package com.levi9.reddit.community.controller;

import com.levi9.reddit.community.dto.InternalCommunityDTO;
import com.levi9.reddit.community.service.CommunityMembershipService;
import com.levi9.reddit.community.service.CommunityService;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Service-to-service reads for post-service. Private network only; never routed through the gateway. */
@Hidden
@RestController
@RequestMapping("/internal/communities")
@Tag(name = "Internal communities")
@RequiredArgsConstructor
public class InternalCommunityController {
    private final CommunityService communityService;
    private final CommunityMembershipService membershipService;

    @GetMapping("/{id}")
    @Operation(summary = "Community name and active status; 404 if it is missing or inactive")
    public InternalCommunityDTO getCommunity(@PathVariable long id) {
        return communityService.getActiveById(id);
    }

    @GetMapping("/{id}/members/{userId}")
    @Operation(summary = "204 if the user has joined the community, 404 otherwise")
    public ResponseEntity<Void> isMember(@PathVariable long id, @PathVariable long userId) {
        return membershipService.isMember(id, userId)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
