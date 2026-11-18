package com.levi9.reddit.auth.core.service;

import com.levi9.reddit.auth.core.exception.ErrorType;
import com.levi9.reddit.auth.core.exception.ForbiddenException;
import com.levi9.reddit.auth.core.exception.NotFoundException;
import com.levi9.reddit.auth.core.exception.UnauthorizedException;
import com.levi9.reddit.auth.core.model.User;
import com.levi9.reddit.auth.core.model.UserRole;
import com.levi9.reddit.auth.infrastructure.repository.RefreshTokenRepository;
import com.levi9.reddit.auth.infrastructure.repository.UserRepository;
import java.time.Instant;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwords;

    public UserService(UserRepository users, RefreshTokenRepository refreshTokens, PasswordEncoder passwords) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwords = passwords;
    }

    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = users.findUserById(userId)
                .filter(candidate -> !candidate.isDeleted())
                .orElseThrow(() -> new NotFoundException(ErrorType.USER_NOT_FOUND, "User not found"));
        verifyPassword(user, currentPassword);
        user.changePasswordHash(passwords.encode(newPassword));
        refreshTokens.revokeAllActiveByUserId(userId, Instant.now());
    }

    @Transactional
    public void delete(Long userId, String password) {
        User user = users.findById(userId)
                .filter(candidate -> !candidate.isDeleted())
                .orElseThrow(() -> new NotFoundException(ErrorType.USER_NOT_FOUND, "User not found"));
        if (user.getRole() != UserRole.USER) {
            throw new ForbiddenException(ErrorType.ACCOUNT_DELETION_FORBIDDEN, "This account cannot be deleted");
        }
        verifyPassword(user, password);
        user.delete();
        refreshTokens.revokeAllActiveByUserId(userId, Instant.now());
    }

    private void verifyPassword(User user, String password) {
        if (!passwords.matches(password, user.getPasswordHash())) {
            throw new UnauthorizedException(ErrorType.INVALID_CREDENTIALS, "Invalid password");
        }
    }
}
