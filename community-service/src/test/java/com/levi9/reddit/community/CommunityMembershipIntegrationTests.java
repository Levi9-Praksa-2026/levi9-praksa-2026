package com.levi9.reddit.community;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.levi9.reddit.community.core.exception.CommunityNotFoundException;
import com.levi9.reddit.community.core.model.Community;
import com.levi9.reddit.community.core.model.CommunityMemberId;
import com.levi9.reddit.community.infrastructure.CommunityMembershipService;
import com.levi9.reddit.community.infrastructure.repository.CommunityMemberRepository;
import com.levi9.reddit.community.infrastructure.repository.CommunityRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/**
 * Real-database checks for membership. These tests are deliberately NOT transactional: the lock and the
 * committed member_count can only be exercised when each service call commits on its own.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class CommunityMembershipIntegrationTests {

    @Autowired
    private CommunityRepository communityRepository;

    @Autowired
    private CommunityMemberRepository communityMemberRepository;

    @Autowired
    private CommunityMembershipService membershipService;

    @AfterEach
    void cleanUp() {
        communityMemberRepository.deleteAll();
        communityRepository.deleteAll();
    }

    @Test
    void joinTwiceThenLeaveKeepsMembershipAndCountInSync() {
        Community community = communityRepository.save(new Community("backend", 1L));

        membershipService.join("backend", 42L);
        membershipService.join("backend", 42L);

        assertThat(communityMemberRepository.existsById(new CommunityMemberId(community.getId(), 42L))).isTrue();
        assertThat(communityRepository.findById(community.getId()).orElseThrow().getMemberCount()).isEqualTo(1);

        membershipService.leave("backend", 42L);

        assertThat(communityMemberRepository.count()).isZero();
        assertThat(communityRepository.findById(community.getId()).orElseThrow().getMemberCount()).isZero();
    }

    @Test
    void leaveWorksForDeactivatedCommunityButJoinDoesNot() {
        Community community = communityRepository.save(new Community("archived", 1L));
        membershipService.join("archived", 42L);

        // Load a fresh copy: the instance from before join still holds the old member_count.
        Community stored = communityRepository.findById(community.getId()).orElseThrow();
        stored.deactivate();
        communityRepository.save(stored);

        membershipService.leave("archived", 42L);

        assertThat(communityMemberRepository.existsById(new CommunityMemberId(community.getId(), 42L))).isFalse();
        assertThat(communityRepository.findById(community.getId()).orElseThrow().getMemberCount()).isZero();

        assertThatThrownBy(() -> membershipService.join("archived", 7L))
                .isInstanceOf(CommunityNotFoundException.class);
    }

    @Test
    void concurrentJoinsCountExactlyOncePerUser() throws Exception {
        int users = 8;
        Community community = communityRepository.save(new Community("backend", 0L));
        ExecutorService executor = Executors.newFixedThreadPool(users);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> results = new ArrayList<>();

        try {
            for (long i = 0; i < users; i++) {
                long userId = 100 + i;
                results.add(executor.submit(() -> {
                    start.await();
                    membershipService.join("backend", userId);
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> result : results) {
                result.get(60, TimeUnit.SECONDS);
            }
        } finally {
            executor.shutdownNow();
        }

        assertThat(communityMemberRepository.count()).isEqualTo(users);
        assertThat(communityRepository.findById(community.getId()).orElseThrow().getMemberCount())
                .isEqualTo(users);
    }
}
