package com.levi9.reddit.post.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.levi9.reddit.post.client.CommunityDirectory;
import com.levi9.reddit.post.dto.CreatePostDTO;
import com.levi9.reddit.post.entity.Actor;
import com.levi9.reddit.post.entity.Post;
import com.levi9.reddit.post.exception.CommunityServiceUnavailableException;
import com.levi9.reddit.post.repository.PostRepository;
import com.levi9.reddit.post.storage.ImageStorage;
import java.net.ConnectException;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Where the transaction boundary of post creation lies. Runs the real Spring proxies (with a transaction manager
 * that only counts) to prove that community-service is asked while no transaction, and so no database connection,
 * is held, and that the save still runs in one.
 */
@SpringJUnitConfig(PostCreateTransactionTest.Config.class)
class PostCreateTransactionTest {
    private static final Actor AUTHOR = new Actor(5, "marko", false);
    private static final CreatePostDTO REQUEST = new CreatePostDTO("Hello", null, 7L);

    @Autowired
    private PostCommandService service;

    @Autowired
    private CommunityDirectory communities;

    @Autowired
    private PostRepository posts;

    @Autowired
    private CountingTransactionManager transactions;

    /** Whether a transaction was active at each community check, in call order. */
    private final List<Boolean> transactionDuringCheck = new ArrayList<>();

    @BeforeEach
    void memberOfActiveCommunity() {
        reset(communities, posts);
        transactions.begun = 0;
        transactionDuringCheck.clear();
        when(communities.findActiveName(anyLong())).thenAnswer(call -> recordCheck(Optional.of("java")));
        when(communities.isMember(anyLong(), anyLong())).thenAnswer(call -> recordCheck(true));
        when(posts.save(any(Post.class))).thenAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive())
                    .as("the post is saved inside a transaction").isTrue();
            return call.getArgument(0);
        });
    }

    @Test
    void communityChecksRunOutsideTheTransaction_saveRunsInsideIt() {
        service.create(REQUEST, List.of(), AUTHOR);

        assertThat(transactionDuringCheck).containsExactly(false, false);
        assertThat(transactions.begun).isEqualTo(1);
        verify(posts).save(any(Post.class));
    }

    @Test
    void communityServiceDown_neverOpensATransaction() {
        when(communities.findActiveName(anyLong()))
                .thenThrow(new CommunityServiceUnavailableException(new ConnectException("refused")));

        assertThatThrownBy(() -> service.create(REQUEST, List.of(), AUTHOR))
                .isInstanceOf(CommunityServiceUnavailableException.class);

        assertThat(transactions.begun).isZero();
        verify(posts, never()).save(any());
    }

    private <T> T recordCheck(T answer) {
        transactionDuringCheck.add(TransactionSynchronizationManager.isActualTransactionActive());
        return answer;
    }

    @Configuration(proxyBeanMethods = false)
    @EnableTransactionManagement
    @Import({PostCommandService.class, NewPostWriter.class})
    static class Config {
        @Bean
        CountingTransactionManager transactionManager() {
            return new CountingTransactionManager();
        }

        @Bean
        CommunityDirectory communityDirectory() {
            return mock(CommunityDirectory.class);
        }

        @Bean
        PostRepository postRepository() {
            return mock(PostRepository.class);
        }

        @Bean
        ImageStorage imageStorage() {
            return mock(ImageStorage.class);
        }

        @Bean
        Clock clock() {
            return Clock.systemUTC();
        }
    }

    /** A transaction manager without a database: it only counts how many transactions were started. */
    static class CountingTransactionManager extends AbstractPlatformTransactionManager
            implements PlatformTransactionManager {
        int begun;

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            begun++;
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
        }
    }
}
