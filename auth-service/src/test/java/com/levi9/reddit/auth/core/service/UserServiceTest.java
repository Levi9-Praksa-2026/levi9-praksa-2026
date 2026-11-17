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
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class UserServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();
    private final UserService service = new UserService(users, tokens, passwords);
    private User user;

    @BeforeEach
    void setUp() {
        user = new User("reader", "reader@example.test", passwords.encode("secret"), "First", "Last");
        when(users.findById(1L)).thenReturn(Optional.of(user));
    }

    @Test
    void deletesUserAndRevokesTokens() {
        service.delete(1L, "secret");
        assertThat(user.isDeleted()).isTrue();
        verify(tokens).revokeAllActiveByUserId(eq(1L), any(Instant.class));
    }

    @Test
    void rejectsWrongPasswordWithoutDeleting() {
        assertThatThrownBy(() -> service.delete(1L, "wrong"))
                .isInstanceOfSatisfying(UnauthorizedException.class,
                        error -> assertThat(error.getErrorType()).isEqualTo(ErrorType.INVALID_CREDENTIALS));
        assertThat(user.isDeleted()).isFalse();
        verifyNoInteractions(tokens);
    }

    @Test
    void rejectsAlreadyDeletedUser() {
        user.delete();
        assertThatThrownBy(() -> service.delete(1L, "secret"))
                .isInstanceOfSatisfying(NotFoundException.class,
                        error -> assertThat(error.getErrorType()).isEqualTo(ErrorType.USER_NOT_FOUND));
        verifyNoInteractions(tokens);
    }

    @Test
    void rejectsUserThatDoesNotExist() {
        when(users.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(1L, "secret"))
                .isInstanceOfSatisfying(NotFoundException.class,
                        error -> assertThat(error.getErrorType()).isEqualTo(ErrorType.USER_NOT_FOUND));
        verifyNoInteractions(tokens);
    }

    @Test
    void rejectsAdministratorWithoutRevokingTokens() {
        User admin = mock(User.class);
        when(admin.getRole()).thenReturn(UserRole.ADMIN);
        when(users.findById(1L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.delete(1L, "secret"))
                .isInstanceOfSatisfying(ForbiddenException.class,
                        error -> assertThat(error.getErrorType()).isEqualTo(ErrorType.ACCOUNT_DELETION_FORBIDDEN));
        verifyNoInteractions(tokens);
        verify(admin, never()).delete();
    }
}
