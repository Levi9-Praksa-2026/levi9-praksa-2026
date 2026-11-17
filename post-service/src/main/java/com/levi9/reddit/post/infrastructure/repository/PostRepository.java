package com.levi9.reddit.post.infrastructure.repository;

import com.levi9.reddit.post.core.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<Post, Long> {}
