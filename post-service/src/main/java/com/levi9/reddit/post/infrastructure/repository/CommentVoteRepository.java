package com.levi9.reddit.post.infrastructure.repository;

import com.levi9.reddit.post.core.model.CommentVote;
import com.levi9.reddit.post.core.model.CommentVoteId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentVoteRepository extends JpaRepository<CommentVote, CommentVoteId> {}
