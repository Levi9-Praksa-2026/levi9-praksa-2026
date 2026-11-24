package com.levi9.reddit.post.client;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import org.junit.jupiter.api.Test;

class StubCommunityDirectoryTest {

    @Test
    void byDefault_everyCommunityIsActiveAndEveryoneIsAMember() {
        var stub = new StubCommunityDirectory(new CommunityStubProperties(true, null, null));

        assertThat(stub.isActive(1)).isTrue();
        assertThat(stub.isMember(1, 42)).isTrue();
    }

    @Test
    void unavailableCommunity_isInactiveAndHasNoMembers() {
        var stub = new StubCommunityDirectory(new CommunityStubProperties(true, Set.of(999L), Set.of()));

        assertThat(stub.isActive(999)).isFalse();
        assertThat(stub.isMember(999, 42)).isFalse();
        assertThat(stub.isActive(1)).isTrue();
    }

    @Test
    void nonMemberUser_isMemberOfNothing() {
        var stub = new StubCommunityDirectory(new CommunityStubProperties(true, Set.of(), Set.of(999L)));

        assertThat(stub.isMember(1, 999)).isFalse();
        assertThat(stub.isMember(2, 999)).isFalse();
        assertThat(stub.isMember(1, 42)).isTrue();
    }
}
