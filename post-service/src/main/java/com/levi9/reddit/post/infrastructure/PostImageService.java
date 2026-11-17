package com.levi9.reddit.post.infrastructure;

import com.levi9.reddit.post.core.model.Post;
import com.levi9.reddit.post.infrastructure.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

@Service
public class PostImageService {
    private final PostRepository posts;

    public PostImageService(PostRepository posts) {
        this.posts = posts;
    }

    @Transactional
    public void addImage(Long postId, String s3Key) {
        findPostForUpdate(postId).addImage(s3Key);
    }

    @Transactional
    public String removeImage(Long postId, Long imageId) {
        Post post = findPostForUpdate(postId);
        var image = post.getImages().stream()
                .filter(candidate -> candidate.getId().equals(imageId))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("Image not found on post: " + imageId));
        post.removeImage(image);
        return image.getS3Key();
    }

    private Post findPostForUpdate(Long postId) {
        return posts.findByIdForUpdate(postId)
                .orElseThrow(() -> new NoSuchElementException("Post not found: " + postId));
    }
}
