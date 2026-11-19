package com.levi9.reddit.post.infrastructure;

import com.levi9.reddit.post.contracts.CreatePostRequest;
import com.levi9.reddit.post.contracts.EditPostRequest;
import com.levi9.reddit.post.contracts.PostResponse;
import com.levi9.reddit.post.core.CommunityDirectory;
import com.levi9.reddit.post.core.exception.CommunityUnavailableException;
import com.levi9.reddit.post.core.exception.NotCommunityMemberException;
import com.levi9.reddit.post.core.exception.PostNotFoundException;
import com.levi9.reddit.post.core.model.Actor;
import com.levi9.reddit.post.core.model.Post;
import com.levi9.reddit.post.infrastructure.repository.PostRepository;
import java.time.Clock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creating, editing and removing posts on behalf of a logged-in {@link Actor}. Who may edit or remove is decided by
 * {@link Post#editBy} and {@link Post#removeBy}; this service loads, checks the community and saves.
 */
@Service
@Transactional
public class PostCommandService {
    private final PostRepository posts;
    private final CommunityDirectory communities;
    private final Clock clock;

    public PostCommandService(PostRepository posts, CommunityDirectory communities, Clock clock) {
        this.posts = posts;
        this.communities = communities;
        this.clock = clock;
    }

    /**
     * @throws CommunityUnavailableException the community doesn't exist or was shut down (422)
     * @throws NotCommunityMemberException   the caller hasn't joined the community (403)
     */
    public PostResponse create(CreatePostRequest request, Actor actor) {
        long communityId = request.communityId();
        if (!communities.isActive(communityId)) {
            throw new CommunityUnavailableException(communityId);
        }
        if (!communities.isMember(communityId, actor.id())) {
            throw new NotCommunityMemberException(communityId);
        }
        // The author always comes from the caller, never from the request.
        Post post = new Post(request.title(), request.content(), actor.id(), actor.username(), communityId);
        return PostMapper.toResponse(posts.save(post));
    }

    /**
     * Only the author may edit; a removed post is a 404.
     *
     * @throws PostNotFoundException the post doesn't exist or was removed (404)
     */
    public PostResponse edit(long postId, EditPostRequest request, Actor actor) {
        Post post = loadForUpdate(postId);
        post.editBy(actor, request.title(), request.content(), clock.instant());
        return PostMapper.toResponse(post);
    }

    /**
     * Soft remove by the author or an admin. Removing an already removed post succeeds without changes.
     *
     * @throws PostNotFoundException the post never existed (404)
     */
    public void delete(long postId, Actor actor) {
        loadForUpdate(postId).removeBy(actor, clock.instant());
    }

    // The row lock makes concurrent edits/removals of one post run one after another instead of interleaving.
    private Post loadForUpdate(long postId) {
        return posts.findByIdForUpdate(postId).orElseThrow(() -> new PostNotFoundException(postId));
    }
}
