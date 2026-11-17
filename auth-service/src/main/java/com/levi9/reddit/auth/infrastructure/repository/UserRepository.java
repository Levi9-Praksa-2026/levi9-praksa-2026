package com.levi9.reddit.auth.infrastructure.repository;

import com.levi9.reddit.auth.core.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {}
