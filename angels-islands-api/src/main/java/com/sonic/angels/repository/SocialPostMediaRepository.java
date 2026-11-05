package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SocialPostMedia;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface SocialPostMediaRepository extends JpaRepository<SocialPostMedia, UUID> {

    String SHOWN = " AND p.postedAt <= :t AND (p.audience IS NULL OR p.audience <> com.sonic.angels.model.entity.SocialPost.Audience.ONLY_ME OR p.author.id = :viewer)";

    @Query("SELECT pm FROM SocialPostMedia pm JOIN FETCH pm.mediaFile WHERE pm.post.id IN :postIds ORDER BY pm.position")
    List<SocialPostMedia> findByPostIdIn(Collection<UUID> postIds);

    /** Photos a profile posted (its uploads), newest first — not the picture-change posts, whose photos have albums of their own. */
    @Query("SELECT pm FROM SocialPostMedia pm JOIN FETCH pm.mediaFile JOIN FETCH pm.post p WHERE p.author.id = :pid" +
           " AND p.kind NOT IN (com.sonic.angels.model.entity.SocialPost.Kind.AVATAR_CHANGE, com.sonic.angels.model.entity.SocialPost.Kind.COVER_CHANGE)" +
           SHOWN + " ORDER BY p.postedAt DESC, pm.position")
    List<SocialPostMedia> uploadsOf(UUID pid, UUID viewer, LocalDateTime t, Pageable page);

    @Query("SELECT COUNT(pm) FROM SocialPostMedia pm JOIN pm.post p WHERE p.author.id = :pid" +
           " AND p.kind NOT IN (com.sonic.angels.model.entity.SocialPost.Kind.AVATAR_CHANGE, com.sonic.angels.model.entity.SocialPost.Kind.COVER_CHANGE)" + SHOWN)
    long countUploadsOf(UUID pid, UUID viewer, LocalDateTime t);

    /** Photos of posts that tag a profile, by anyone. */
    @Query("SELECT pm FROM SocialPostMedia pm JOIN FETCH pm.mediaFile JOIN FETCH pm.post p WHERE EXISTS (SELECT 1 FROM SocialPostTag t WHERE t.post = p AND t.profile.id = :pid)" +
           SHOWN + " ORDER BY p.postedAt DESC, pm.position")
    List<SocialPostMedia> taggedOf(UUID pid, UUID viewer, LocalDateTime t, Pageable page);

    @Query("SELECT pm FROM SocialPostMedia pm JOIN FETCH pm.mediaFile JOIN FETCH pm.post p WHERE p.album.id = :albumId" +
           SHOWN + " ORDER BY p.postedAt, pm.position")
    List<SocialPostMedia> ofAlbum(UUID albumId, UUID viewer, LocalDateTime t);

    /** album id, photo count, newest post time — for the album list. */
    @Query("SELECT p.album.id, COUNT(pm), MAX(p.postedAt) FROM SocialPostMedia pm JOIN pm.post p WHERE p.album.id IN :albumIds" + SHOWN +
           " GROUP BY p.album.id")
    List<Object[]> albumStats(Collection<UUID> albumIds, UUID viewer, LocalDateTime t);

    /** Photos posted without an album by a profile on its own wall ("Timeline Photos"). */
    @Query("SELECT pm FROM SocialPostMedia pm JOIN FETCH pm.mediaFile JOIN FETCH pm.post p WHERE p.author.id = :pid AND p.wall.id = :pid AND p.album IS NULL" +
           " AND p.kind NOT IN (com.sonic.angels.model.entity.SocialPost.Kind.AVATAR_CHANGE, com.sonic.angels.model.entity.SocialPost.Kind.COVER_CHANGE)" +
           SHOWN + " ORDER BY p.postedAt, pm.position")
    List<SocialPostMedia> looseOf(UUID pid, UUID viewer, LocalDateTime t);
}
