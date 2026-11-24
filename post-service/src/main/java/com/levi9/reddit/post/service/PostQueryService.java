package com.levi9.reddit.post.service;

import com.levi9.reddit.post.dto.CommentDTO;
import com.levi9.reddit.post.dto.PageDTO;
import com.levi9.reddit.post.dto.PostDTO;
import com.levi9.reddit.post.dto.TopPeriod;
import com.levi9.reddit.post.entity.Comment;
import com.levi9.reddit.post.entity.Post;
import com.levi9.reddit.post.entity.PostImage;
import com.levi9.reddit.post.exception.ImageNotFoundException;
import com.levi9.reddit.post.exception.PostNotFoundException;
import com.levi9.reddit.post.repository.CommentRepository;
import com.levi9.reddit.post.repository.PostRepository;
import com.levi9.reddit.post.storage.ImageStorage.StoredImage;
import com.levi9.reddit.post.storage.ImageStorage;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only queries for posts and comments. Removed posts and comments are never returned. */
@Service
@Transactional(readOnly = true)
@Slf4j
@RequiredArgsConstructor
public class PostQueryService {
    // id breaks ties, so two rows with the same timestamp never swap places between pages.
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private static final Duration WEEK = Duration.ofDays(7);

    private final PostRepository posts;
    private final CommentRepository comments;
    private final ImageStorage imageStorage;
    private final Clock clock;

    /**
     * Newest posts first. Both filters are optional and can be combined.
     *
     * @param communityId only posts of this community, or {@code null} for all communities
     * @param query       text the title must contain (case-insensitive), or {@code null}/blank for no search
     */
    public PageDTO<PostDTO> findPosts(Long communityId, String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, NEWEST_FIRST);
        String title = query == null || query.isBlank() ? null : query.strip();

        Page<Post> result;
        if (communityId != null && title != null) {
            result = posts.findByCommunityIdAndTitleContainingIgnoreCaseAndRemovedAtIsNull(communityId, title, pageable);
        } else if (communityId != null) {
            result = posts.findByCommunityIdAndRemovedAtIsNull(communityId, pageable);
        } else if (title != null) {
            result = posts.findByTitleContainingIgnoreCaseAndRemovedAtIsNull(title, pageable);
        } else {
            result = posts.findByRemovedAtIsNull(pageable);
        }
        return toPage(result, PostMapper::toResponse);
    }

    /**
     * The 10 posts with the highest score. Removed posts don't count.
     * {@link TopPeriod#WEEK} looks only at posts created in the last 7 days.
     */
    public List<PostDTO> findTop(TopPeriod period) {
        List<Post> top = switch (period) {
            case ALL -> posts.findTop10ByRemovedAtIsNullOrderByScoreDescIdDesc();
            case WEEK -> posts.findTop10ByCreatedAtGreaterThanEqualAndRemovedAtIsNullOrderByScoreDescIdDesc(
                    clock.instant().minus(WEEK));
        };
        return top.stream().map(PostMapper::toResponse).toList();
    }

    public PostDTO getPost(Long id) {
        return posts.findByIdAndRemovedAtIsNull(id)
                .map(PostMapper::toResponse)
                .orElseThrow(() -> new PostNotFoundException(id));
    }

    /**
     * The file of one image of a visible post. Images of a removed post disappear together with the post.
     *
     * @throws PostNotFoundException  the post is missing or removed
     * @throws ImageNotFoundException the post has no such image, or its file is missing from storage
     */
    public StoredImage getImage(Long postId, Long imageId) {
        Post post = posts.findByIdAndRemovedAtIsNull(postId).orElseThrow(() -> new PostNotFoundException(postId));
        PostImage image = post.getImages().stream()
                .filter(candidate -> candidate.getId().equals(imageId))
                .findFirst()
                .orElseThrow(() -> new ImageNotFoundException(postId, imageId));
        return imageStorage.load(image.getS3Key()).orElseThrow(() -> {
            // The database says the file exists: worth a look, but for the caller it's simply not there.
            log.warn("Image {} of post {} is missing from storage (key {})", imageId, postId, image.getS3Key());
            return new ImageNotFoundException(postId, imageId);
        });
    }

    /** Comments of a visible post, newest first. 404 if the post itself is missing or removed. */
    public PageDTO<CommentDTO> findComments(Long postId, int page, int size) {
        if (!posts.existsByIdAndRemovedAtIsNull(postId)) {
            throw new PostNotFoundException(postId);
        }
        Page<Comment> result = comments.findByPostIdAndRemovedAtIsNull(postId, PageRequest.of(page, size, NEWEST_FIRST));
        return toPage(result, PostQueryService::toResponse);
    }

    private static <E, R> PageDTO<R> toPage(Page<E> page, Function<E, R> mapper) {
        return new PageDTO<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }

    private static CommentDTO toResponse(Comment comment) {
        return new CommentDTO(
                comment.getId(),
                comment.getPostId(),
                comment.getAuthorId(),
                comment.getAuthorUsername(),
                comment.getContent(),
                comment.getScore(),
                comment.getCreatedAt());
    }
}
