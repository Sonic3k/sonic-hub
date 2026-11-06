package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SocialPost;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Reads at a moment T take a cursor (cAt, cId): the page continues after the last post seen, newest first.
 * hasCursor=false reads from T down.
 */
@Repository
public interface SocialPostRepository extends JpaRepository<SocialPost, UUID> {

    String CURSOR = " AND p.postedAt <= :t AND (:hasCursor = false OR p.postedAt < :cAt OR (p.postedAt = :cAt AND p.id < :cId))";
    String NEWEST = " ORDER BY p.postedAt DESC, p.id DESC";
    String HIDDEN_FROM_OTHERS = " AND (p.audience IS NULL OR p.audience <> com.sonic.angels.model.entity.SocialPost.Audience.ONLY_ME OR p.author.id = :viewer)";

    Optional<SocialPost> findByExternalKey(String externalKey);

    List<SocialPost> findByExternalKeyIn(Collection<String> keys);

    /** A timeline: what stands on the wall, and the posts its owner is tagged in. */
    @Query("SELECT p FROM SocialPost p WHERE (p.wall.id = :wallId OR EXISTS (SELECT 1 FROM SocialPostTag t WHERE t.post = p AND t.profile.id = :wallId))" +
           HIDDEN_FROM_OTHERS + CURSOR + NEWEST)
    List<SocialPost> timeline(UUID wallId, UUID viewer, LocalDateTime t, boolean hasCursor, LocalDateTime cAt, UUID cId, Pageable page);

    /** The posts pinned to the top of a wall by T. */
    @Query("SELECT p FROM SocialPost p WHERE p.wall.id = :wallId AND p.pinned = true AND p.postedAt <= :t" + NEWEST)
    List<SocialPost> pinned(UUID wallId, LocalDateTime t);

    /** The news feed: posts by the people followed, and on the walls followed (friends, groups, pages, self). */
    @Query("SELECT p FROM SocialPost p WHERE (p.author.id IN :authors OR p.wall.id IN :walls)" + HIDDEN_FROM_OTHERS + CURSOR + NEWEST)
    List<SocialPost> feed(Collection<UUID> authors, Collection<UUID> walls, UUID viewer, LocalDateTime t,
                          boolean hasCursor, LocalDateTime cAt, UUID cId, Pageable page);

    /** Every post by T, for a feed with no owner set up yet. */
    @Query("SELECT p FROM SocialPost p WHERE (p.audience IS NULL OR p.audience <> com.sonic.angels.model.entity.SocialPost.Audience.ONLY_ME)" +
           CURSOR + NEWEST)
    List<SocialPost> everything(LocalDateTime t, boolean hasCursor, LocalDateTime cAt, UUID cId, Pageable page);

    /** Notes and articles a profile wrote. */
    @Query("SELECT p FROM SocialPost p WHERE p.author.id = :authorId AND p.kind IN (com.sonic.angels.model.entity.SocialPost.Kind.NOTE, " +
           "com.sonic.angels.model.entity.SocialPost.Kind.ARTICLE)" + HIDDEN_FROM_OTHERS + CURSOR + NEWEST)
    List<SocialPost> notes(UUID authorId, UUID viewer, LocalDateTime t, boolean hasCursor, LocalDateTime cAt, UUID cId, Pageable page);

    /** What two people share: posts one wrote on the other's wall, and posts that tag one written by or tagging the other. */
    @Query("SELECT p FROM SocialPost p WHERE (" +
           " (p.author.id = :a AND p.wall.id = :b) OR (p.author.id = :b AND p.wall.id = :a)" +
           " OR (EXISTS (SELECT 1 FROM SocialPostTag t WHERE t.post = p AND t.profile.id = :a)" +
           "     AND (p.author.id = :b OR EXISTS (SELECT 1 FROM SocialPostTag u WHERE u.post = p AND u.profile.id = :b)))" +
           " OR (EXISTS (SELECT 1 FROM SocialPostTag t WHERE t.post = p AND t.profile.id = :b) AND p.author.id = :a))" +
           HIDDEN_FROM_OTHERS + CURSOR + NEWEST)
    List<SocialPost> between(UUID a, UUID b, UUID viewer, LocalDateTime t, boolean hasCursor, LocalDateTime cAt, UUID cId, Pageable page);

    @Query("SELECT MIN(p.postedAt), MAX(p.postedAt), COUNT(p) FROM SocialPost p")
    List<Object[]> range();

    @Query(value = "SELECT posted_at FROM social_posts ORDER BY random() LIMIT 1", nativeQuery = true)
    List<Object> randomMoment();

    @Query("SELECT p.externalKey FROM SocialPost p WHERE p.externalKey LIKE :prefix ORDER BY p.externalKey")
    List<String> keysLike(String prefix);
}
