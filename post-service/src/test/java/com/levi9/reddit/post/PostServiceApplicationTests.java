package com.levi9.reddit.post;

import com.levi9.reddit.post.core.model.Comment;
import com.levi9.reddit.post.core.model.CommentVote;
import com.levi9.reddit.post.core.model.CommentVoteId;
import com.levi9.reddit.post.core.model.Post;
import com.levi9.reddit.post.core.model.PostImage;
import com.levi9.reddit.post.core.model.PostVote;
import com.levi9.reddit.post.core.model.PostVoteId;
import com.levi9.reddit.post.infrastructure.repository.CommentRepository;
import com.levi9.reddit.post.infrastructure.repository.CommentVoteRepository;
import com.levi9.reddit.post.infrastructure.repository.PostImageRepository;
import com.levi9.reddit.post.infrastructure.repository.PostRepository;
import com.levi9.reddit.post.infrastructure.repository.PostVoteRepository;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class PostServiceApplicationTests {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private PostImageRepository postImageRepository;

    @Autowired
    private PostVoteRepository postVoteRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private CommentVoteRepository commentVoteRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void persistsAndReloadsServiceModels() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        Post post = postRepository.save(new Post("Original title", 42L, "reader", 7L));
        PostImage image = postImageRepository.save(new PostImage(post.getId(), "posts/example.png"));
        PostVoteId postVoteId = new PostVoteId(post.getId(), 43L);
        postVoteRepository.save(new PostVote(postVoteId, (short) 1));
        Comment comment = commentRepository.save(new Comment(post.getId(), 43L, "writer", "A reply"));
        CommentVoteId commentVoteId = new CommentVoteId(comment.getId(), 42L);
        commentVoteRepository.save(new CommentVote(commentVoteId, (short) -1));
        post.edit("Updated title", "Body", now);
        post.updateScore(1);
        post.updateCommentCount(1);
        post.remove(99L, now);
        comment.updateScore(-1);
        comment.remove(99L, now);

        entityManager.flush();
        entityManager.clear();

        Post stored = postRepository.findById(post.getId()).orElseThrow();
        assertThat(stored.getTitle()).isEqualTo("Updated title");
        assertThat(stored.getContent()).isEqualTo("Body");
        assertThat(stored.getAuthorId()).isEqualTo(42L);
        assertThat(stored.getAuthorUsername()).isEqualTo("reader");
        assertThat(stored.getCommunityId()).isEqualTo(7L);
        assertThat(stored.getScore()).isEqualTo(1);
        assertThat(stored.getCommentCount()).isEqualTo(1);
        assertThat(stored.getVersion()).isEqualTo(1);
        assertThat(stored.getUpdatedAt()).isEqualTo(now);
        assertThat(stored.getRemovedAt()).isEqualTo(now);
        assertThat(stored.getRemovedBy()).isEqualTo(99L);

        PostImage storedImage = postImageRepository.findById(image.getId()).orElseThrow();
        assertThat(storedImage.getPostId()).isEqualTo(post.getId());
        assertThat(storedImage.getS3Key()).isEqualTo("posts/example.png");

        PostVote postVote = postVoteRepository.findById(postVoteId).orElseThrow();
        assertThat(postVote.getId()).isEqualTo(postVoteId);
        assertThat(postVote.getValue()).isEqualTo((short) 1);

        Comment storedComment = commentRepository.findById(comment.getId()).orElseThrow();
        assertThat(storedComment.getPostId()).isEqualTo(post.getId());
        assertThat(storedComment.getAuthorId()).isEqualTo(43L);
        assertThat(storedComment.getAuthorUsername()).isEqualTo("writer");
        assertThat(storedComment.getContent()).isEqualTo("A reply");
        assertThat(storedComment.getScore()).isEqualTo(-1);
        assertThat(storedComment.getRemovedAt()).isEqualTo(now);
        assertThat(storedComment.getRemovedBy()).isEqualTo(99L);

        CommentVote commentVote = commentVoteRepository.findById(commentVoteId).orElseThrow();
        assertThat(commentVote.getId()).isEqualTo(commentVoteId);
        assertThat(commentVote.getValue()).isEqualTo((short) -1);
    }
}
