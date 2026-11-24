package com.levi9.reddit.auth.config;

import com.levi9.reddit.auth.dto.RegisterDTO;
import com.levi9.reddit.auth.exception.ConflictException;
import com.levi9.reddit.auth.repository.UserRepository;
import com.levi9.reddit.auth.service.AuthService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * Dev profile only: one ADMIN account at startup, so a fresh local database can try every admin endpoint with a
 * real token. Roles otherwise only change in the database. Production never has this bean.
 * <p>
 * Created through registration, so the same rules apply. An account that already has the email is left exactly as
 * it is, even a USER, so restarts never change anything.
 */
@Slf4j
@Configuration(proxyBeanMethods = false)
@Profile("dev")
@EnableConfigurationProperties(DevAdminProperties.class)
class DevAdminAccount {

    @Bean
    ApplicationRunner createDevAdmin(DevAdminProperties admin, UserRepository users, AuthService auth,
                                     Validator validator, TransactionTemplate transaction) {
        return args -> {
            RegisterDTO account = new RegisterDTO(admin.username(), admin.email(), admin.password(), "Dev", "Admin");
            Set<ConstraintViolation<RegisterDTO>> problems = validator.validate(account);
            if (!problems.isEmpty()) {   // a typo in the settings: fail loudly rather than start without an admin
                throw new IllegalStateException("app.dev-admin breaks the registration rules: " + problems.stream()
                        .map(p -> p.getPropertyPath() + " " + p.getMessage())
                        .collect(Collectors.joining(", ")));
            }
            if (users.existsByEmailIgnoringCase(admin.email())) {
                log.info("Dev admin account {} already exists, left as it is", admin.email());
                return;
            }
            try {
                transaction.executeWithoutResult(status -> auth.register(account).grantAdmin());
                log.info("Created dev admin account {}", admin.email());
            } catch (ConflictException e) {   // e.g. the username belongs to another account
                log.warn("Dev admin account {} not created: {}", admin.email(), e.getMessage());
            }
        };
    }
}
