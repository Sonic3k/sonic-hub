package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SocialComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SocialCommentRepository extends JpaRepository<SocialComment, UUID> {

    Optional<SocialComment> findByExternalKey(String externalKey);

    List<SocialComment> findByExternalKeyIn(Collection<String> keys);

    /** Every comment and reply on these posts written by T, oldest first. */
    @Query("SELECT c FROM SocialComment c JOIN FETCH c.author LEFT JOIN FETCH c.mediaFile WHERE c.post.id IN :postIds AND c.postedAt <= :t " +
           "ORDER BY c.postedAt, c.id")
    List<SocialComment> visibleOn(Collection<UUID> postIds, LocalDateTime t);

    @Query("SELECT c.post.id, COUNT(c) FROM SocialComment c WHERE c.post.id IN :postIds AND c.postedAt <= :t GROUP BY c.post.id")
    List<Object[]> countVisible(Collection<UUID> postIds, LocalDateTime t);
}
