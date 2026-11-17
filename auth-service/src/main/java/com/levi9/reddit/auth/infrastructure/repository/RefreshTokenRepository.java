package com.levi9.reddit.auth.infrastructure.repository;

import com.levi9.reddit.auth.core.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {}
