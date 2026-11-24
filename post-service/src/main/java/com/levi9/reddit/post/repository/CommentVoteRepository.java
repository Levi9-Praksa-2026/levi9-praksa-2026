package com.levi9.reddit.post.repository;

import com.levi9.reddit.post.entity.CommentVote;
import com.levi9.reddit.post.entity.CommentVoteId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentVoteRepository extends JpaRepository<CommentVote, CommentVoteId> {}
