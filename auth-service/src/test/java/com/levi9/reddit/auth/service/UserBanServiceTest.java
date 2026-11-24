package com.levi9.reddit.auth.service;

import com.levi9.reddit.auth.entity.User;
import com.levi9.reddit.auth.entity.UserRole;
import com.levi9.reddit.auth.exception.ConflictException;
import com.levi9.reddit.auth.exception.DomainException;
import com.levi9.reddit.auth.exception.ErrorType;
import com.levi9.reddit.auth.exception.ForbiddenException;
import com.levi9.reddit.auth.exception.NotFoundException;
import com.levi9.reddit.auth.repository.UserRepository;
import com.levi9.reddit.auth.security.AuthorizationRevoker;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class UserBanServiceTest {
    private static final Long ADMIN_ID = 7L;

    private final UserRepository users = mock(UserRepository.class);
    private final AuthorizationRevoker authorizations = mock(AuthorizationRevoker.class);
    private final UserBanService service = new UserBanService(users, authorizations);
    private User user;

    @BeforeEach
    void setUp() {
        user = new User("reader", "reader@example.test", "hash", "First", "Last");
        ReflectionTestUtils.setField(user, "id", 42L);
        when(users.findByUsernameIgnoringCase("reader")).thenReturn(Optional.of(user));
        when(users.findByUsernameIgnoringCase("nobody")).thenReturn(Optional.empty());
    }

    @Test
    void banSetsAllBanFieldsAndStripsTheReason() {
        Instant before = Instant.now();

        service.ban("reader", ADMIN_ID, "  spam  ");

        assertThat(user.isBanned()).isTrue();
        assertThat(user.getBanReason()).isEqualTo("spam");
        assertThat(user.getBannedBy()).isEqualTo(ADMIN_ID);
        assertThat(user.getBannedAt()).isBetween(before, Instant.now());
        verify(authorizations).revokeAllOf(42L);
    }

    @Test
    void unbanClearsAllBanFields() {
        user.ban(ADMIN_ID, "spam", Instant.now());

        service.unban("reader");

        assertThat(user.isBanned()).isFalse();
        assertThat(user.getBanReason()).isNull();
        assertThat(user.getBannedBy()).isNull();
        assertThat(user.getBannedAt()).isNull();
        verifyNoInteractions(authorizations); // an unban brings no session back
    }

    @Test
    void unknownUserIsNotFound() {
        assertErrorType(() -> service.ban("nobody", ADMIN_ID, "spam"), NotFoundException.class, ErrorType.USER_NOT_FOUND);
        assertErrorType(() -> service.unban("nobody"), NotFoundException.class, ErrorType.USER_NOT_FOUND);
        verifyNoInteractions(authorizations);
    }

    @Test
    void deletedUserIsNotFound() {
        user.delete();

        assertErrorType(() -> service.ban("reader", ADMIN_ID, "spam"), NotFoundException.class, ErrorType.USER_NOT_FOUND);
        assertErrorType(() -> service.unban("reader"), NotFoundException.class, ErrorType.USER_NOT_FOUND);
        assertThat(user.isBanned()).isFalse();
    }

    @Test
    void adminCannotBeBanned() {
        ReflectionTestUtils.setField(user, "role", UserRole.ADMIN);

        assertErrorType(() -> service.ban("reader", ADMIN_ID, "spam"), ForbiddenException.class, ErrorType.ADMIN_BAN_FORBIDDEN);
        assertThat(user.isBanned()).isFalse();
        verifyNoInteractions(authorizations);
    }

    @Test
    void banningABannedUserConflictsAndKeepsTheOriginalBan() {
        Instant originalAt = Instant.parse("2026-11-01T10:00:00Z");
        user.ban(1L, "original", originalAt);

        assertErrorType(() -> service.ban("reader", ADMIN_ID, "new"), ConflictException.class, ErrorType.USER_ALREADY_BANNED);
        assertThat(user.getBanReason()).isEqualTo("original");
        assertThat(user.getBannedBy()).isEqualTo(1L);
        assertThat(user.getBannedAt()).isEqualTo(originalAt);
        verifyNoInteractions(authorizations);
    }

    @Test
    void unbanningAUserWhoIsNotBannedConflicts() {
        assertErrorType(() -> service.unban("reader"), ConflictException.class, ErrorType.USER_NOT_BANNED);
    }

    @Test
    void usernameLookupIgnoresCaseThroughTheRepository() {
        when(users.findByUsernameIgnoringCase(anyString())).thenReturn(Optional.empty());
        when(users.findByUsernameIgnoringCase("READER")).thenReturn(Optional.of(user));

        service.ban("READER", ADMIN_ID, "spam");

        assertThat(user.isBanned()).isTrue();
    }

    private static void assertErrorType(Runnable call, Class<? extends DomainException> type, ErrorType errorType) {
        assertThatThrownBy(call::run)
                .isInstanceOf(type)
                .extracting(e -> ((DomainException) e).getErrorType())
                .isEqualTo(errorType);
    }
}
