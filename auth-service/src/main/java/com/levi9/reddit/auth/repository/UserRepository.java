package com.levi9.reddit.auth.repository;

import com.levi9.reddit.auth.entity.User;
import com.levi9.reddit.auth.entity.UserRole;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Usernames and emails are unique ignoring case ({@code ux_users_username_lower}, {@code ux_users_email_lower}).
 * The lookups use {@code lower(...)} explicitly so Postgres can use those indexes. Spring Data's
 * {@code ...IgnoreCase} method names generate {@code upper(...)}, which the indexes don't cover.
 * Deleted and banned users are included on purpose: their usernames and emails stay taken, and login
 * decides what a deleted or banned user gets.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /** All accounts, including deleted ones; filters and paging are applied in the database. */
    @Query("""
            select u from User u
            where (:pattern is null or lower(u.username) like :pattern escape '!'
                or lower(u.email) like :pattern escape '!'
                or lower(u.firstName) like :pattern escape '!'
                or lower(u.lastName) like :pattern escape '!')
            and (:status is null
                or (:status = 'active' and u.deleted = false and u.banned = false)
                or (:status = 'banned' and u.deleted = false and u.banned = true)
                or (:status = 'deleted' and u.deleted = true))
            and (:role is null or u.role = :role)
            """)
    Page<User> findForAdmin(@Param("pattern") String pattern, @Param("status") String status, @Param("role") UserRole role, Pageable pageable);

    /** Locks the row until the transaction ends ({@code select ... for update}). Use it before changing a user. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<User> findUserById(Long id);

    /** Login looks users up by email. */
    @Query("select u from User u where lower(u.email) = lower(:email)")
    Optional<User> findByEmailIgnoringCase(@Param("email") String email);

    @Query("select u from User u where lower(u.username) = lower(:username)")
    Optional<User> findByUsernameIgnoringCase(@Param("username") String username);

    @Query("select count(u) > 0 from User u where lower(u.username) = lower(:username)")
    boolean existsByUsernameIgnoringCase(@Param("username") String username);

    @Query("select count(u) > 0 from User u where lower(u.email) = lower(:email)")
    boolean existsByEmailIgnoringCase(@Param("email") String email);

    /** Whether any account that isn't deleted has this role. The bootstrap admin uses it. */
    boolean existsByRoleAndDeletedFalse(UserRole role);
}
