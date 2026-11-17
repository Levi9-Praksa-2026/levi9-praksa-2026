package com.levi9.reddit.post.api;

import com.levi9.reddit.post.contracts.CommentResponse;
import com.levi9.reddit.post.contracts.PageResponse;
import com.levi9.reddit.post.contracts.PostResponse;
import com.levi9.reddit.post.infrastructure.PostQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts")
@Tag(name = "Posts")
public class PostController {
    private final PostQueryService postQueryService;

    public PostController(PostQueryService postQueryService) {
        this.postQueryService = postQueryService;
    }

    @GetMapping
    @Operation(summary = "Latest posts, optionally filtered by community and/or searched by title")
    public PageResponse<PostResponse> findPosts(
            @RequestParam(required = false) Long communityId,
            @RequestParam(required = false) @Size(max = 300) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return postQueryService.findPosts(communityId, q, page, size);
    }

    @GetMapping("/{id}")
    @Operation(summary = "A single post; 404 if it doesn't exist or was removed")
    public PostResponse getPost(@PathVariable Long id) {
        return postQueryService.getPost(id);
    }

    @GetMapping("/{id}/comments")
    @Operation(summary = "Comments of a post, newest first")
    public PageResponse<CommentResponse> findComments(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return postQueryService.findComments(id, page, size);
    }
}
