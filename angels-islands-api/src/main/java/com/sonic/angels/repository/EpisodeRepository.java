package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Episode;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EpisodeRepository extends JpaRepository<Episode, UUID> {
    /** Memories that happened in [from, to) — a day on the desktop. Drafts are left out. */
    @org.springframework.data.jpa.repository.Query("SELECT e FROM Episode e LEFT JOIN FETCH e.person WHERE e.occurredAt >= :from AND e.occurredAt < :to " +
        "AND (e.status IS NULL OR e.status <> com.sonic.angels.model.entity.MemoryStatus.DRAFT) ORDER BY e.occurredAt")
    List<Episode> occurredBetween(java.time.LocalDateTime from, java.time.LocalDateTime to);
    /** Memories up to a moment, newest first (drafts left out); q matches the title or the summary. */
    @org.springframework.data.jpa.repository.Query("SELECT e FROM Episode e WHERE e.occurredAt <= :t " +
        "AND (e.status IS NULL OR e.status <> com.sonic.angels.model.entity.MemoryStatus.DRAFT) " +
        "AND (:q = '' OR LOWER(COALESCE(e.title, '')) LIKE :q OR LOWER(e.summary) LIKE :q) ORDER BY e.occurredAt DESC")
    org.springframework.data.domain.Page<Episode> upTo(java.time.LocalDateTime t, String q, org.springframework.data.domain.Pageable page);
    List<Episode> findByPersonIdOrderByOccurredAtDesc(UUID personId);

    /** A person's memories, newest first, narrowed in the database to those linked to a tag, a person, a photo or an
     *  album (has… false: that link is not asked about, its id is a placeholder). */
    @org.springframework.data.jpa.repository.Query("SELECT e FROM Episode e WHERE e.person.id = :personId " +
        "AND (:hasTag = false OR EXISTS (SELECT 1 FROM e.tags t WHERE t.id = :tagId)) " +
        "AND (:hasWith = false OR EXISTS (SELECT 1 FROM e.persons p WHERE p.id = :withId)) " +
        "AND (:hasMedia = false OR EXISTS (SELECT 1 FROM e.mediaFiles m WHERE m.id = :mediaId)) " +
        "AND (:hasCollection = false OR EXISTS (SELECT 1 FROM e.collections c WHERE c.id = :collectionId)) " +
        "ORDER BY e.occurredAt DESC")
    List<Episode> findLinked(@org.springframework.data.repository.query.Param("personId") UUID personId,
        @org.springframework.data.repository.query.Param("hasTag") boolean hasTag, @org.springframework.data.repository.query.Param("tagId") UUID tagId,
        @org.springframework.data.repository.query.Param("hasWith") boolean hasWith, @org.springframework.data.repository.query.Param("withId") UUID withId,
        @org.springframework.data.repository.query.Param("hasMedia") boolean hasMedia, @org.springframework.data.repository.query.Param("mediaId") UUID mediaId,
        @org.springframework.data.repository.query.Param("hasCollection") boolean hasCollection, @org.springframework.data.repository.query.Param("collectionId") UUID collectionId);

    /** The ids of a person's memories that a random pick may take (status / minImportance null: any). */
    @org.springframework.data.jpa.repository.Query("SELECT e.id FROM Episode e WHERE e.person.id = :personId " +
        "AND (:anyStatus = true OR e.status = :status) AND (:anyImportance = true OR e.importance >= :minImportance)")
    List<UUID> idsForPick(@org.springframework.data.repository.query.Param("personId") UUID personId,
        @org.springframework.data.repository.query.Param("anyStatus") boolean anyStatus,
        @org.springframework.data.repository.query.Param("status") com.sonic.angels.model.entity.MemoryStatus status,
        @org.springframework.data.repository.query.Param("anyImportance") boolean anyImportance,
        @org.springframework.data.repository.query.Param("minImportance") int minImportance);
    List<Episode> findByPersonIdAndImportanceGreaterThanEqual(UUID personId, Integer importance);

    // the four link tables: a bulk delete of episodes (below) skips them, and a deleted photo / album / tag / person
    // must leave them first or the FK refuses
    String OF_SOURCE = "(SELECT id FROM episodes WHERE person_id = :personId AND source = :source)";
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM episode_media WHERE episode_id IN " + OF_SOURCE, nativeQuery = true)
    int unlinkMediaOfSource(@org.springframework.data.repository.query.Param("personId") UUID personId,
                            @org.springframework.data.repository.query.Param("source") String source);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM episode_collections WHERE episode_id IN " + OF_SOURCE, nativeQuery = true)
    int unlinkCollectionsOfSource(@org.springframework.data.repository.query.Param("personId") UUID personId,
                                  @org.springframework.data.repository.query.Param("source") String source);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM episode_tags WHERE episode_id IN " + OF_SOURCE, nativeQuery = true)
    int unlinkTagsOfSource(@org.springframework.data.repository.query.Param("personId") UUID personId,
                           @org.springframework.data.repository.query.Param("source") String source);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM episode_persons WHERE episode_id IN " + OF_SOURCE, nativeQuery = true)
    int unlinkPersonsOfSource(@org.springframework.data.repository.query.Param("personId") UUID personId,
                              @org.springframework.data.repository.query.Param("source") String source);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM episode_sources WHERE episode_id IN " + OF_SOURCE, nativeQuery = true)
    int deleteSourcesOfSource(@org.springframework.data.repository.query.Param("personId") UUID personId,
                              @org.springframework.data.repository.query.Param("source") String source);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM episode_media WHERE media_file_id = :mediaId", nativeQuery = true)
    int unlinkMedia(@org.springframework.data.repository.query.Param("mediaId") UUID mediaId);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM episode_collections WHERE collection_id = :collectionId", nativeQuery = true)
    int unlinkCollection(@org.springframework.data.repository.query.Param("collectionId") UUID collectionId);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM episode_tags WHERE tag_id = :tagId", nativeQuery = true)
    int unlinkTag(@org.springframework.data.repository.query.Param("tagId") UUID tagId);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM episode_persons WHERE person_id = :personId", nativeQuery = true)
    int unlinkPerson(@org.springframework.data.repository.query.Param("personId") UUID personId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Episode x WHERE x.person.id = :personId AND x.source = :source")
    int deleteByPersonAndSource(@org.springframework.data.repository.query.Param("personId") UUID personId,
                                @org.springframework.data.repository.query.Param("source") String source);

    /** external key, game, place in that game's list — for the memories of one import that games are linked to. The link
     *  rows go with the old rows of a re-import (ON DELETE CASCADE); these are what puts them back on the new ones. */
    @org.springframework.data.jpa.repository.Query(value = "SELECT e.external_key, CAST(gm.game_id AS varchar), gm.sort_order FROM game_memories gm "
        + "JOIN episodes e ON e.id = gm.episode_id WHERE e.person_id = :personId AND e.source = :source AND e.external_key IS NOT NULL", nativeQuery = true)
    java.util.List<Object[]> gameLinksOfSource(@org.springframework.data.repository.query.Param("personId") java.util.UUID personId,
                                              @org.springframework.data.repository.query.Param("source") String source);

    /** external key, song, role, note, place in that song's list — the same for the songs tied to them */
    @org.springframework.data.jpa.repository.Query(value = "SELECT e.external_key, CAST(tm.track_id AS varchar), tm.role, tm.note, tm.sort_order FROM music_track_memories tm "
        + "JOIN episodes e ON e.id = tm.episode_id WHERE e.person_id = :personId AND e.source = :source AND e.external_key IS NOT NULL", nativeQuery = true)
    java.util.List<Object[]> trackLinksOfSource(@org.springframework.data.repository.query.Param("personId") java.util.UUID personId,
                                               @org.springframework.data.repository.query.Param("source") String source);

    /** external key -> event, for the memories of one import that belong to an event (kept across a re-import) */
    @org.springframework.data.jpa.repository.Query(value = "SELECT external_key, CAST(life_event_id AS varchar) FROM episodes WHERE person_id = :personId AND source = :source "
        + "AND life_event_id IS NOT NULL AND external_key IS NOT NULL", nativeQuery = true)
    java.util.List<Object[]> eventLinksOfSource(@org.springframework.data.repository.query.Param("personId") java.util.UUID personId,
                                               @org.springframework.data.repository.query.Param("source") String source);
}
