package com.levi9.reddit.post.infrastructure.repository;

import com.levi9.reddit.post.core.model.PostImage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostImageRepository extends JpaRepository<PostImage, Long> {}
