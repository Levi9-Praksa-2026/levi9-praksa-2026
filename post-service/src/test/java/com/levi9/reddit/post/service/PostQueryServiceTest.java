package com.levi9.reddit.post.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.levi9.reddit.post.dto.CommentDTO;
import com.levi9.reddit.post.dto.PageDTO;
import com.levi9.reddit.post.dto.PostDTO;
import com.levi9.reddit.post.dto.TopPeriod;
import com.levi9.reddit.post.entity.Comment;
import com.levi9.reddit.post.entity.Post;
import com.levi9.reddit.post.exception.PostNotFoundException;
import com.levi9.reddit.post.repository.CommentRepository;
import com.levi9.reddit.post.repository.PostRepository;
import com.levi9.reddit.post.storage.ImageStorage;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@ExtendWith(MockitoExtension.class)
class PostQueryServiceTest {

    @Mock
    private PostRepository posts;

    @Mock
    private CommentRepository comments;

    @Mock
    private ImageStorage imageStorage;

    private static final Instant NOW = Instant.parse("2026-11-18T12:00:00Z");

    private PostQueryService service;

    @BeforeEach
    void setUp() {
        service = new PostQueryService(posts, comments, imageStorage, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void findPosts_withoutFilters_returnsAllVisiblePostsNewestFirst() {
        Post post = new Post("Hello", 1L, "luka", 7L);
        when(posts.findByRemovedAtIsNull(any())).thenReturn(page(post));

        PageDTO<PostDTO> result = service.findPosts(null, null, 0, 20);

        assertThat(result.content()).extracting(PostDTO::title).containsExactly("Hello");
        assertThat(result.totalElements()).isEqualTo(1);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(posts).findByRemovedAtIsNull(pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isZero();
        assertThat(pageable.getValue().getPageSize()).isEqualTo(20);
        assertThat(pageable.getValue().getSort())
                .isEqualTo(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
    }

    @Test
    void findPosts_withCommunity_filtersByCommunity() {
        when(posts.findByCommunityIdAndRemovedAtIsNull(eq(7L), any())).thenReturn(Page.empty());

        service.findPosts(7L, "  ", 0, 20);

        verify(posts).findByCommunityIdAndRemovedAtIsNull(eq(7L), any());
    }

    @Test
    void findPosts_withQuery_searchesTrimmedTitle() {
        when(posts.findByTitleContainingIgnoreCaseAndRemovedAtIsNull(eq("spring"), any())).thenReturn(Page.empty());

        service.findPosts(null, "  spring ", 0, 20);

        verify(posts).findByTitleContainingIgnoreCaseAndRemovedAtIsNull(eq("spring"), any());
    }

    @Test
    void findPosts_withCommunityAndQuery_combinesFilters() {
        when(posts.findByCommunityIdAndTitleContainingIgnoreCaseAndRemovedAtIsNull(eq(7L), eq("spring"), any()))
                .thenReturn(Page.empty());

        service.findPosts(7L, "spring", 0, 20);

        verify(posts).findByCommunityIdAndTitleContainingIgnoreCaseAndRemovedAtIsNull(eq(7L), eq("spring"), any());
    }

    @Test
    void findTop_all_mapsRepositoryResultInOrder() {
        Post best = new Post("Best", 1L, "luka", 7L);
        best.updateScore(50);
        Post second = new Post("Second", 2L, "ana", 7L);
        second.updateScore(10);
        when(posts.findTop10ByRemovedAtIsNullOrderByScoreDescIdDesc()).thenReturn(List.of(best, second));

        List<PostDTO> result = service.findTop(TopPeriod.ALL);

        assertThat(result).extracting(PostDTO::title).containsExactly("Best", "Second");
        assertThat(result).extracting(PostDTO::score).containsExactly(50, 10);
    }

    @Test
    void findTop_week_asksForPostsCreatedInTheLastSevenDays() {
        Instant weekAgo = NOW.minus(Duration.ofDays(7));
        Post recent = new Post("Recent", 1L, "luka", 7L);
        when(posts.findTop10ByCreatedAtGreaterThanEqualAndRemovedAtIsNullOrderByScoreDescIdDesc(weekAgo))
                .thenReturn(List.of(recent));

        List<PostDTO> result = service.findTop(TopPeriod.WEEK);

        assertThat(result).extracting(PostDTO::title).containsExactly("Recent");
        verify(posts, never()).findTop10ByRemovedAtIsNullOrderByScoreDescIdDesc();
    }

    @Test
    void getPost_returnsVisiblePost() {
        Post post = new Post("Hello", 1L, "luka", 7L);
        when(posts.findByIdAndRemovedAtIsNull(5L)).thenReturn(Optional.of(post));

        PostDTO result = service.getPost(5L);

        assertThat(result.title()).isEqualTo("Hello");
        assertThat(result.authorUsername()).isEqualTo("luka");
        assertThat(result.communityId()).isEqualTo(7L);
    }

    @Test
    void getPost_missingOrRemoved_throwsNotFound() {
        when(posts.findByIdAndRemovedAtIsNull(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getPost(5L)).isInstanceOf(PostNotFoundException.class);
    }

    @Test
    void findComments_ofVisiblePost_returnsComments() {
        Comment comment = new Comment(5L, 2L, "ana", "Nice post");
        when(posts.existsByIdAndRemovedAtIsNull(5L)).thenReturn(true);
        when(comments.findByPostIdAndRemovedAtIsNull(eq(5L), any())).thenReturn(page(comment));

        PageDTO<CommentDTO> result = service.findComments(5L, 0, 20);

        assertThat(result.content()).extracting(CommentDTO::content).containsExactly("Nice post");
    }

    @Test
    void findComments_ofMissingPost_throwsNotFoundWithoutQueryingComments() {
        when(posts.existsByIdAndRemovedAtIsNull(5L)).thenReturn(false);

        assertThatThrownBy(() -> service.findComments(5L, 0, 20)).isInstanceOf(PostNotFoundException.class);
        verify(comments, never()).findByPostIdAndRemovedAtIsNull(any(), any());
    }

    private static <T> Page<T> page(T item) {
        return new PageImpl<>(List.of(item), PageRequest.of(0, 20), 1);
    }
}
