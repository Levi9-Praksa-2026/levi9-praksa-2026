package com.levi9.reddit.auth.service;

import com.levi9.reddit.auth.dto.UpdateUserRequest;
import com.levi9.reddit.auth.dto.UserProfileResponse;
import com.levi9.reddit.auth.entity.User;
import com.levi9.reddit.auth.entity.UserRole;
import com.levi9.reddit.auth.exception.ConflictException;
import com.levi9.reddit.auth.exception.ErrorType;
import com.levi9.reddit.auth.exception.ForbiddenException;
import com.levi9.reddit.auth.exception.NotFoundException;
import com.levi9.reddit.auth.exception.UnauthorizedException;
import com.levi9.reddit.auth.exception.UserBannedException;
import com.levi9.reddit.auth.repository.UserRepository;
import com.levi9.reddit.auth.security.AuthorizationRevoker;
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
    private final AuthorizationRevoker authorizations;
    private final PasswordEncoder passwords;

    public UserService(UserRepository users, AuthorizationRevoker authorizations, PasswordEncoder passwords) {
        this.users = users;
        this.authorizations = authorizations;
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
            verifyPassword(user, request.getCurrentPassword());
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
        verifyPassword(user, password);
        user.delete();
        authorizations.revokeAllOf(userId);
    }

    private static UserProfileResponse toProfileResponse(User user) {
        return new UserProfileResponse(user.getId(), user.getUsername(), user.getEmail(),
                user.getFirstName(), user.getLastName());
    }

    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword, String currentAccessToken) {
        User user = users.findUserById(userId)
                .filter(candidate -> !candidate.isDeleted())
                .orElseThrow(() -> new NotFoundException(ErrorType.USER_NOT_FOUND, "User not found"));
        verifyPassword(user, currentPassword);
        user.changePasswordHash(passwords.encode(newPassword), Instant.now());
        // Every other login ends; the one making the change continues.
        authorizations.revokeAllExcept(userId, currentAccessToken);
    }

    private void verifyPassword(User user, String password) {
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
