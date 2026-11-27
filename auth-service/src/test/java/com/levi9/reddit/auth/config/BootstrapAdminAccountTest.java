package com.levi9.reddit.auth.config;

import com.levi9.reddit.auth.repository.UserRepository;
import com.levi9.reddit.auth.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

/** When BootstrapAdminAccount is active at all, and what bad settings do. The database side is in BootstrapAdminAccountTests. */
class BootstrapAdminAccountTest {
    private final UserRepository users = mock(UserRepository.class);
    private final AuthService auth = mock(AuthService.class);

    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withUserConfiguration(BootstrapAdminAccount.class)
            .withBean(UserRepository.class, () -> users)
            .withBean(AuthService.class, () -> auth)
            .withBean(LocalValidatorFactoryBean.class);

    @Test
    void withoutSettingsThereIsNoRunner() {
        context.run(ctx -> assertThat(ctx).doesNotHaveBean(ApplicationRunner.class));
    }

    @Test
    void settingsThatBreakTheRegistrationRulesStopStartupBeforeTouchingTheDatabase() {
        context.withPropertyValues(
                        "app.bootstrap-admin.username=siteadmin",
                        "app.bootstrap-admin.email=admin@levddit.example",
                        "app.bootstrap-admin.password=short")
                .run(ctx -> {
                    ApplicationRunner runner = ctx.getBean(ApplicationRunner.class);

                    assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                            .isInstanceOf(IllegalStateException.class)
                            .hasMessageContaining("password");
                    verifyNoInteractions(users, auth);
                });
    }
}
