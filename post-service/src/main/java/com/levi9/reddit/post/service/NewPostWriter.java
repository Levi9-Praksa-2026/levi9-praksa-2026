package com.levi9.reddit.post.service;

import com.levi9.reddit.post.dto.CreatePostDTO;
import com.levi9.reddit.post.dto.PostDTO;
import com.levi9.reddit.post.entity.Actor;
import com.levi9.reddit.post.entity.ImageUpload;
import com.levi9.reddit.post.entity.Post;
import com.levi9.reddit.post.repository.PostRepository;
import com.levi9.reddit.post.storage.ImageStorage;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * The transactional half of creating a post: upload the images and save the post. Everything that can reject the
 * request is checked before this runs ({@link PostCommandService#create}), outside any transaction, so no database
 * connection is held while waiting on community-service.
 *
 * <p>A separate bean on purpose: a call from {@link PostCommandService} into its own {@code @Transactional} method
 * would bypass Spring's proxy, and no transaction would start.
 */
@Component
@Slf4j
@RequiredArgsConstructor
class NewPostWriter {
    private final PostRepository posts;
    private final ImageStorage imageStorage;

    /**
     * S3 is not part of the database transaction, so files uploaded here are deleted again if it rolls back.
     *
     * @param communityName the community's name as community-service gave it, kept on the post
     * @param uploads       already checked images, in the order the client sent them; may be empty
     */
    @Transactional
    public PostDTO write(CreatePostDTO request, String communityName, List<ImageUpload> uploads, Actor actor) {
        // The author always comes from the caller, never from the request.
        Post post = new Post(request.title(), request.content(), actor.id(), actor.username(),
                request.communityId(), communityName);
        List<String> storedKeys = uploads.isEmpty() ? List.of() : deleteOnRollback();
        for (ImageUpload upload : uploads) {
            String key = "posts/" + UUID.randomUUID() + "." + upload.type().extension();
            imageStorage.store(key, upload.content(), upload.type().contentType());
            storedKeys.add(key);
            post.addImage(key);
        }
        return PostMapper.toResponse(posts.save(post));
    }

    /**
     * A list the caller fills with stored image keys; when the surrounding transaction rolls back (an exception
     * here, a failed flush or a failed commit), every key in it is deleted from storage. A failed delete is only
     * logged: the request already failed for another reason, and an orphaned file is harmless.
     */
    private List<String> deleteOnRollback() {
        List<String> keys = new ArrayList<>();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_COMMITTED) {
                    return;
                }
                for (String key : keys) {
                    try {
                        imageStorage.delete(key);
                    } catch (RuntimeException e) {
                        log.warn("Could not delete image {} after a failed post creation", key, e);
                    }
                }
            }
        });
        return keys;
    }
}
