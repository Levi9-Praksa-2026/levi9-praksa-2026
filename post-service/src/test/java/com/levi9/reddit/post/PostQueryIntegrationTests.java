package com.levi9.reddit.post;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.levi9.reddit.post.entity.Comment;
import com.levi9.reddit.post.entity.Post;
import com.levi9.reddit.post.repository.CommentRepository;
import com.levi9.reddit.post.repository.PostRepository;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** The GET endpoints end to end: HTTP, security, service and real Postgres queries. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@Transactional // every test's data is rolled back afterwards
class PostQueryIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CommentRepository commentRepository;

    private Post springPost;
    private Post removedPost;

    @BeforeEach
    void setUp() {
        // Saved one by one, so ids grow: the newest post has the largest id.
        postRepository.save(new Post("First in backend", 1L, "luka", 100L));
        springPost = postRepository.save(new Post("Learning SPRING Boot", 2L, "ana", 100L));
        postRepository.save(new Post("React tips", 3L, "mika", 200L));
        removedPost = new Post("Removed spring post", 1L, "luka", 100L);
        removedPost.remove(99L, Instant.now());
        removedPost = postRepository.save(removedPost);

        commentRepository.save(new Comment(springPost.getId(), 3L, "mika", "Older comment"));
        commentRepository.save(new Comment(springPost.getId(), 1L, "luka", "Newer comment"));
        Comment removedComment = new Comment(springPost.getId(), 1L, "luka", "Removed comment");
        removedComment.remove(1L, Instant.now());
        commentRepository.save(removedComment);
    }

    @Test
    void listsVisiblePostsNewestFirst() throws Exception {
        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].title")
                        .value(contains("React tips", "Learning SPRING Boot", "First in backend")))
                .andExpect(jsonPath("$.totalElements").value(3));
    }

    @Test
    void paginates() throws Exception {
        mockMvc.perform(get("/api/posts").param("page", "1").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].title").value(contains("First in backend")))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void filtersByCommunity() throws Exception {
        mockMvc.perform(get("/api/posts").param("communityId", "200"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].title").value(contains("React tips")));
    }

    @Test
    void searchesTitleCaseInsensitivelyAndSkipsRemovedPosts() throws Exception {
        mockMvc.perform(get("/api/posts").param("q", "spring"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].title").value(contains("Learning SPRING Boot")));
    }

    @Test
    void searchTreatsPercentSignLiterally() throws Exception {
        mockMvc.perform(get("/api/posts").param("q", "%"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void combinesCommunityAndSearch() throws Exception {
        mockMvc.perform(get("/api/posts").param("communityId", "200").param("q", "spring"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void getsSinglePost() throws Exception {
        mockMvc.perform(get("/api/posts/{id}", springPost.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Learning SPRING Boot"))
                .andExpect(jsonPath("$.authorUsername").value("ana"));
    }

    @Test
    void removedPostIsNotFound() throws Exception {
        mockMvc.perform(get("/api/posts/{id}", removedPost.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void listsVisibleCommentsNewestFirst() throws Exception {
        mockMvc.perform(get("/api/posts/{id}/comments", springPost.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].content").value(contains("Newer comment", "Older comment")));
    }

    @Test
    void commentsOfRemovedPostAreNotFound() throws Exception {
        mockMvc.perform(get("/api/posts/{id}/comments", removedPost.getId()))
                .andExpect(status().isNotFound());
    }
}
