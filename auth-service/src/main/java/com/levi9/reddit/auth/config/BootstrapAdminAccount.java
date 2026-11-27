package com.levi9.reddit.auth.config;

import com.levi9.reddit.auth.dto.RegisterDTO;
import com.levi9.reddit.auth.entity.UserRole;
import com.levi9.reddit.auth.exception.ConflictException;
import com.levi9.reddit.auth.repository.UserRepository;
import com.levi9.reddit.auth.service.AuthService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * Production's first ADMIN account. A fresh database has no admin, and only an admin can create another one, so
 * auth-service creates it at startup from {@code app.bootstrap-admin.*} (the {@code levddit/bootstrap-admin} secret
 * on AWS). Only active when those settings exist, so local runs and the dev profile never see it.
 * <p>
 * Runs once in effect: as soon as any ADMIN exists, it does nothing. An account that already has the email or
 * username is never promoted: registration doesn't prove who owns an email, so whoever registered it first could
 * otherwise become admin with a password of their own choosing.
 */
@Slf4j
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "app.bootstrap-admin", name = "email")
@EnableConfigurationProperties(BootstrapAdminProperties.class)
class BootstrapAdminAccount {

    @Bean
    ApplicationRunner createBootstrapAdmin(BootstrapAdminProperties admin, UserRepository users, AuthService auth,
                                           Validator validator) {
        return args -> {
            RegisterDTO account = new RegisterDTO(admin.username(), admin.email(), admin.password(), "Site", "Admin");
            Set<ConstraintViolation<RegisterDTO>> problems = validator.validate(account);
            if (!problems.isEmpty()) {   // a typo in the secret: fail loudly rather than start without an admin
                throw new IllegalStateException("app.bootstrap-admin breaks the registration rules: " + problems.stream()
                        .map(p -> p.getPropertyPath() + " " + p.getMessage())
                        .collect(Collectors.joining(", ")));
            }
            if (users.existsByRoleAndDeletedFalse(UserRole.ADMIN)) {
                log.info("An admin account already exists, bootstrap admin not needed");
                return;
            }
            try {
                auth.createByAdmin(account, UserRole.ADMIN);
                log.info("Created bootstrap admin account {}", admin.email());
            } catch (ConflictException e) {   // the email or username belongs to an existing account
                log.warn("Bootstrap admin account {} not created, an existing account is never promoted: {}",
                        admin.email(), e.getMessage());
            }
        };
    }
}
