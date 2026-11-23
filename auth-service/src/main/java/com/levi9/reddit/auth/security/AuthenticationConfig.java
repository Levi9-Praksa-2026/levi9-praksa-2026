package com.levi9.reddit.auth.security;

import com.levi9.reddit.auth.entity.User;
import com.levi9.reddit.auth.repository.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.crypto.password.PasswordEncoder;

/** How a login checks an email and password (used by form login in {@code api.SecurityConfig}). */
@Configuration(proxyBeanMethods = false)
public class AuthenticationConfig {

    /**
     * Spring's default checks the lock before the password, so a banned account would fail without BCrypt, measurably
     * faster than a wrong password: a timing hint that the email exists. Here the password is checked first and the
     * ban after. Unknown emails are already checked against a dummy hash by Spring, so every failure costs one BCrypt.
     * <p>
     * Because the ban is only checked once the password is right, the login may say so, with the admin's reason
     * ({@link BannedAccountException}, answered 403 by {@code LoginResponses}). A wrong password on a banned account
     * gets the same 401 as any other wrong password.
     */
    @Bean
    DaoAuthenticationProvider authenticationProvider(UserAccountService accounts, PasswordEncoder passwords,
                                                     UserRepository users) {
        var provider = new DaoAuthenticationProvider(accounts);
        provider.setPasswordEncoder(passwords);
        provider.setPreAuthenticationChecks(user -> { });
        provider.setPostAuthenticationChecks(user -> {
            if (!user.isAccountNonLocked()) {
                // The account is named by the user id (UserAccountService). One lookup, only for a banned account.
                String reason = users.findById(Long.parseLong(user.getUsername()))
                        .map(User::getBanReason)
                        .orElse(null);
                throw new BannedAccountException(reason);
            }
        });
        return provider;
    }
}
