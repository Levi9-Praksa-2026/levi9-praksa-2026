package com.levi9.reddit.post.service;

import com.levi9.reddit.post.client.CommunityDirectory;
import com.levi9.reddit.post.dto.CreatePostDTO;
import com.levi9.reddit.post.dto.EditPostDTO;
import com.levi9.reddit.post.dto.PostDTO;
import com.levi9.reddit.post.entity.Actor;
import com.levi9.reddit.post.entity.ImageUpload;
import com.levi9.reddit.post.entity.Post;
import com.levi9.reddit.post.exception.CommunityServiceUnavailableException;
import com.levi9.reddit.post.exception.CommunityUnavailableException;
import com.levi9.reddit.post.exception.NotCommunityMemberException;
import com.levi9.reddit.post.exception.PostNotFoundException;
import com.levi9.reddit.post.exception.ValidationException;
import com.levi9.reddit.post.repository.PostRepository;
import java.time.Clock;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creating, editing and removing posts on behalf of a logged-in {@link Actor}. Who may edit or remove is decided by
 * {@link Post#editBy} and {@link Post#removeBy}; this service loads, checks the community and saves.
 *
 * <p>Not {@code @Transactional} as a whole: {@link #create} calls community-service over HTTP, and must not hold a
 * database connection while it waits. Every method that touches the database opens its own transaction.
 */
@Service
@RequiredArgsConstructor
public class PostCommandService {
    private final PostRepository posts;
    private final CommunityDirectory communities;
    private final NewPostWriter newPosts;
    private final Clock clock;

    /**
     * Creates a post with up to three images. Everything that can reject the request (images, community,
     * membership) is checked first, outside any transaction and before any file goes to storage; only the upload
     * and the save run in a transaction ({@link NewPostWriter}).
     *
     * @param images raw file bytes in the order the client sent them; may be empty
     * @throws ValidationException                  too many images, one too large or not an image (422)
     * @throws CommunityUnavailableException        the community doesn't exist or was shut down (422)
     * @throws NotCommunityMemberException          the caller hasn't joined the community (403)
     * @throws CommunityServiceUnavailableException community-service did not answer (503)
     */
    public PostDTO create(CreatePostDTO request, List<byte[]> images, Actor actor) {
        List<ImageUpload> uploads = ImageUpload.validate(images);
        long communityId = request.communityId();
        String communityName = communities.findActiveName(communityId)
                .orElseThrow(() -> new CommunityUnavailableException(communityId));
        if (!communities.isMember(communityId, actor.id())) {
            throw new NotCommunityMemberException(communityId);
        }
        return newPosts.write(request, communityName, uploads, actor);
    }

    /**
     * Only the author may edit; a removed post is a 404.
     *
     * @throws PostNotFoundException the post doesn't exist or was removed (404)
     */
    @Transactional
    public PostDTO edit(long postId, EditPostDTO request, Actor actor) {
        Post post = loadForUpdate(postId);
        post.editBy(actor, request.title(), request.content(), clock.instant());
        return PostMapper.toResponse(post);
    }

    /**
     * Soft remove by the author or an admin. Removing an already removed post succeeds without changes.
     *
     * @throws PostNotFoundException the post never existed (404)
     */
    @Transactional
    public void delete(long postId, Actor actor) {
        loadForUpdate(postId).removeBy(actor, clock.instant());
    }

    // The row lock makes concurrent edits/removals of one post run one after another instead of interleaving.
    private Post loadForUpdate(long postId) {
        return posts.findByIdForUpdate(postId).orElseThrow(() -> new PostNotFoundException(postId));
    }
}
