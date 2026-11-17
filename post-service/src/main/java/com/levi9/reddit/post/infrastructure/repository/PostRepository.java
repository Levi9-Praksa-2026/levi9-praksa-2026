package com.levi9.reddit.post.infrastructure.repository;

import com.levi9.reddit.post.core.model.Post;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Post p where p.id = :id")
    Optional<Post> findByIdForUpdate(@Param("id") Long id);

    // "RemovedAtIsNull" everywhere: removed posts stay in the database but never show up in reads.

    Optional<Post> findByIdAndRemovedAtIsNull(Long id);

    boolean existsByIdAndRemovedAtIsNull(Long id);

    Page<Post> findByRemovedAtIsNull(Pageable pageable);

    Page<Post> findByCommunityIdAndRemovedAtIsNull(Long communityId, Pageable pageable);

    // Spring Data escapes % and _ in the search text, so they match literally instead of as wildcards.
    Page<Post> findByTitleContainingIgnoreCaseAndRemovedAtIsNull(String title, Pageable pageable);

    Page<Post> findByCommunityIdAndTitleContainingIgnoreCaseAndRemovedAtIsNull(
            Long communityId, String title, Pageable pageable);
}
