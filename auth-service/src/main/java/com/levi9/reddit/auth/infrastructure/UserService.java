package com.levi9.reddit.auth.infrastructure;

import com.levi9.reddit.auth.contracts.UpdateUserRequest;
import com.levi9.reddit.auth.contracts.UserProfileResponse;
import com.levi9.reddit.auth.core.exception.ConflictException;
import com.levi9.reddit.auth.core.exception.ErrorType;
import com.levi9.reddit.auth.core.exception.ForbiddenException;
import com.levi9.reddit.auth.core.exception.NotFoundException;
import com.levi9.reddit.auth.core.exception.UnauthorizedException;
import com.levi9.reddit.auth.core.exception.UserBannedException;
import com.levi9.reddit.auth.core.model.User;
import com.levi9.reddit.auth.core.model.UserRole;
import com.levi9.reddit.auth.infrastructure.repository.RefreshTokenRepository;
import com.levi9.reddit.auth.infrastructure.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
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

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(Long userId) {
        return toProfileResponse(requireProfileUser(users.findById(userId)));
    }

    @Transactional
    public UserProfileResponse updateProfile(Long userId, UpdateUserRequest request) {
        User user = requireProfileUser(users.findByIdForUpdate(userId));
        String email = request.getEmail();
        if (email != null && !email.equals(user.getEmail())) {
            requirePassword(user, request.getCurrentPassword());
        }

        user.updateProfile(request.getFirstName(), request.getLastName(), email);
        try {
            users.flush();
        } catch (DataIntegrityViolationException ex) {
            if (ex.getCause() instanceof ConstraintViolationException constraint
                    && "ux_users_email_lower".equals(constraint.getConstraintName())) {
                throw new ConflictException(ErrorType.EMAIL_TAKEN, "Email is already taken");
            }
            throw ex;
        }
        return toProfileResponse(user);
    }

    @Transactional
    public void delete(Long userId, String password) {
        User user = requireExistingUser(users.findByIdForUpdate(userId));
        if (user.getRole() != UserRole.USER) {
            throw new ForbiddenException(ErrorType.ACCOUNT_DELETION_FORBIDDEN, "This account cannot be deleted");
        }
        requirePassword(user, password);
        user.delete();
        refreshTokens.revokeAllActiveByUserId(userId, Instant.now());
    }

    private static UserProfileResponse toProfileResponse(User user) {
        return new UserProfileResponse(user.getId(), user.getUsername(), user.getEmail(),
                user.getFirstName(), user.getLastName());
    }

    private void requirePassword(User user, String password) {
        if (password == null || !passwords.matches(password, user.getPasswordHash())) {
            throw new UnauthorizedException(ErrorType.INVALID_CREDENTIALS, "Invalid password");
        }
    }

    private static User requireExistingUser(Optional<User> candidate) {
        return candidate.filter(user -> !user.isDeleted())
                .orElseThrow(() -> new NotFoundException(ErrorType.USER_NOT_FOUND, "User not found"));
    }

    private static User requireProfileUser(Optional<User> candidate) {
        User user = requireExistingUser(candidate);
        if (user.isBanned()) {
            throw new UserBannedException(user.getBanReason());
        }
        return user;
    }
}
