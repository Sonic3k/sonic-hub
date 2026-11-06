package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SocialReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SocialReactionRepository extends JpaRepository<SocialReaction, UUID> {

    Optional<SocialReaction> findByExternalKey(String externalKey);

    List<SocialReaction> findByExternalKeyIn(Collection<String> keys);

    /** Reactions on these posts themselves (not on one of their photos, not on a comment) given by T. */
    @Query("SELECT r FROM SocialReaction r JOIN FETCH r.profile WHERE r.post.id IN :postIds AND r.comment IS NULL AND r.postMedia IS NULL " +
           "AND (r.reactedAt IS NULL OR r.reactedAt <= :t) ORDER BY r.reactedAt NULLS FIRST, r.id")
    List<SocialReaction> onPosts(Collection<UUID> postIds, LocalDateTime t);

    @Query("SELECT r FROM SocialReaction r JOIN FETCH r.profile WHERE r.comment.id IN :commentIds " +
           "AND (r.reactedAt IS NULL OR r.reactedAt <= :t) ORDER BY r.reactedAt NULLS FIRST, r.id")
    List<SocialReaction> onComments(Collection<UUID> commentIds, LocalDateTime t);

    /** Reactions on one photo of a post given by T. */
    @Query("SELECT r FROM SocialReaction r JOIN FETCH r.profile WHERE r.postMedia.id IN :photoIds AND r.comment IS NULL " +
           "AND (r.reactedAt IS NULL OR r.reactedAt <= :t) ORDER BY r.reactedAt NULLS FIRST, r.id")
    List<SocialReaction> onPhotos(Collection<UUID> photoIds, LocalDateTime t);
}
