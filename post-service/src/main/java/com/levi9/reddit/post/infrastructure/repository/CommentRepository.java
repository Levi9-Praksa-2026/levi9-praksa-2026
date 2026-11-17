package com.levi9.reddit.post.infrastructure.repository;

import com.levi9.reddit.post.core.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {}
