package com.levi9.reddit.post.infrastructure.repository;

import com.levi9.reddit.post.core.model.PostVote;
import com.levi9.reddit.post.core.model.PostVoteId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostVoteRepository extends JpaRepository<PostVote, PostVoteId> {}
