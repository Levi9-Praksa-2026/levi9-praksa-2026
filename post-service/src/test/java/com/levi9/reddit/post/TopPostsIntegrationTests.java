package com.levi9.reddit.post;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.levi9.reddit.post.core.model.Post;
import com.levi9.reddit.post.infrastructure.repository.PostRepository;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** GET /api/posts/top (all time and last 7 days) against real Postgres. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@Transactional // every test's data is rolled back afterwards
class TopPostsIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void returnsTenHighestScoresInOrder() throws Exception {
        for (int score = 1; score <= 12; score++) {
            savePost("Score " + score, score);
        }

        mockMvc.perform(get("/api/posts/top"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(10)))
                .andExpect(jsonPath("$[*].score").value(contains(12, 11, 10, 9, 8, 7, 6, 5, 4, 3)));
    }

    @Test
    void skipsRemovedPostsEvenWithTheHighestScore() throws Exception {
        savePost("Visible", 5);
        Post removed = new Post("Removed", 1L, "luka", 7L);
        removed.updateScore(100);
        removed.remove(99L, Instant.now());
        postRepository.save(removed);

        mockMvc.perform(get("/api/posts/top"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title").value(contains("Visible")))
                .andExpect(jsonPath("$[*].title").value(not(hasItem("Removed"))));
    }

    @Test
    void onEqualScoreNewerPostComesFirst() throws Exception {
        savePost("Older", 7);
        savePost("Newer", 7);

        mockMvc.perform(get("/api/posts/top"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title").value(contains("Newer", "Older")));
    }

    @Test
    void returnsEmptyListWhenThereAreNoPosts() throws Exception {
        mockMvc.perform(get("/api/posts/top"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void week_onlyCountsPostsCreatedInTheLastSevenDays() throws Exception {
        Post old = savePost("Old but popular", 100);
        createdDaysAgo(old, 8);
        Post recent = savePost("Recent", 5);
        createdDaysAgo(recent, 6);
        savePost("Today", 3);

        mockMvc.perform(get("/api/posts/top").param("period", "WEEK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title").value(contains("Recent", "Today")));

        // The same old post still leads the all-time list.
        mockMvc.perform(get("/api/posts/top").param("period", "ALL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Old but popular"));
    }

    @Test
    void week_skipsRemovedPosts() throws Exception {
        savePost("Visible", 1);
        Post removed = new Post("Removed", 1L, "luka", 7L);
        removed.updateScore(50);
        removed.remove(99L, Instant.now());
        postRepository.save(removed);

        mockMvc.perform(get("/api/posts/top").param("period", "WEEK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title").value(contains("Visible")));
    }

    private Post savePost(String title, int score) {
        Post post = new Post(title, 1L, "luka", 7L);
        post.updateScore(score);
        return postRepository.saveAndFlush(post);
    }

    // created_at can't be changed through the entity, so tests move it back in the database directly.
    private void createdDaysAgo(Post post, int days) {
        jdbc.update("update post.posts set created_at = now() - make_interval(days => ?) where id = ?",
                days, post.getId());
    }
}
