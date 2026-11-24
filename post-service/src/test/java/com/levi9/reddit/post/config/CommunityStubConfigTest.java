package com.levi9.reddit.post.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.levi9.reddit.post.client.CommunityDirectory;
import com.levi9.reddit.post.client.StubCommunityDirectory;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.annotation.UserConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class CommunityStubConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(UserConfigurations.of(CommunityStubConfig.class));

    @Test
    void flagOff_registersNoDirectory() {
        contextRunner.run(context -> assertThat(context).doesNotHaveBean(CommunityDirectory.class));
        contextRunner.withPropertyValues("app.community-stub.enabled=false")
                .run(context -> assertThat(context).doesNotHaveBean(CommunityDirectory.class));
    }

    @Test
    void flagOn_registersStubWithCommaSeparatedIdsBound() {
        contextRunner.withPropertyValues(
                        "app.community-stub.enabled=true",
                        "app.community-stub.unavailable-community-ids=999,5",
                        "app.community-stub.non-member-user-ids=999")
                .run(context -> {
                    CommunityDirectory directory = context.getBean(CommunityDirectory.class);
                    assertThat(directory).isInstanceOf(StubCommunityDirectory.class);
                    assertThat(directory.isActive(5)).isFalse();
                    assertThat(directory.isActive(999)).isFalse();
                    assertThat(directory.isMember(1, 999)).isFalse();
                    assertThat(directory.isMember(1, 2)).isTrue();
                });
    }
}
