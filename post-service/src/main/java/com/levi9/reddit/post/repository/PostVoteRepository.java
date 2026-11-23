package com.levi9.reddit.post.repository;

import com.levi9.reddit.post.entity.PostVote;
import com.levi9.reddit.post.entity.PostVoteId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostVoteRepository extends JpaRepository<PostVote, PostVoteId> {}
