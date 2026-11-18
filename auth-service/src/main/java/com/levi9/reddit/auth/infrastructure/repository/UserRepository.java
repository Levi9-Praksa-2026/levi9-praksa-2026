package com.levi9.reddit.auth.infrastructure.repository;

import com.levi9.reddit.auth.core.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * Usernames and emails are unique ignoring case ({@code ux_users_username_lower}, {@code ux_users_email_lower}).
 * The lookups use {@code lower(...)} explicitly so Postgres can use those indexes. Spring Data's
 * {@code ...IgnoreCase} method names generate {@code upper(...)}, which the indexes don't cover.
 * Deleted and banned users are included on purpose: their usernames and emails stay taken, and login
 * decides what a deleted or banned user gets.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /** Login looks users up by email. */
    @Query("select u from User u where lower(u.email) = lower(:email)")
    Optional<User> findByEmailIgnoringCase(@Param("email") String email);

    @Query("select u from User u where lower(u.username) = lower(:username)")
    Optional<User> findByUsernameIgnoringCase(@Param("username") String username);

    @Query("select count(u) > 0 from User u where lower(u.username) = lower(:username)")
    boolean existsByUsernameIgnoringCase(@Param("username") String username);

    @Query("select count(u) > 0 from User u where lower(u.email) = lower(:email)")
    boolean existsByEmailIgnoringCase(@Param("email") String email);
}
