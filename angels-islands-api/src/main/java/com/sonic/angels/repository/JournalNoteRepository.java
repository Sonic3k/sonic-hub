package com.sonic.angels.repository;

import com.sonic.angels.model.entity.JournalNote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JournalNoteRepository extends JpaRepository<JournalNote, UUID> {

    // Articles sort by when they were published, journals by when they were
    // written; COALESCE makes one ORDER BY serve both.
    // Text filters arrive as '' (never null): an untyped null makes Postgres see bytea and LOWER() fails.
    // authorMode: 0 any, 1 Ngoc Anh's own, 2 written by someone else, 3 by the person :authorId, 4 by :authorName.
    @Query("SELECT n FROM JournalNote n LEFT JOIN n.authorPerson ap WHERE " +
        "(:q = '' OR LOWER(n.title) LIKE :q OR LOWER(n.content) LIKE :q) " +
        "AND (:kind IS NULL OR n.kind = :kind) " +
        "AND (:status IS NULL OR n.status = :status) " +
        "AND (:category = '' OR n.category = :category) " +
        "AND (:hasProblem = false OR EXISTS (SELECT 1 FROM JournalNote n2 JOIN n2.problems p WHERE n2.id = n.id AND p.id = :problemId)) " +
        "AND (:hasTag = false OR EXISTS (SELECT 1 FROM JournalNote n3 JOIN n3.tags t WHERE n3.id = n.id AND t.id = :tagId)) " +
        "AND (:authorMode = 0 " +
        "  OR (:authorMode = 1 AND ap.id IS NULL AND n.authorName IS NULL) " +
        "  OR (:authorMode = 2 AND (ap.id IS NOT NULL OR n.authorName IS NOT NULL)) " +
        "  OR (:authorMode = 3 AND ap.id = :authorId) " +
        "  OR (:authorMode = 4 AND ap.id IS NULL AND LOWER(n.authorName) = :authorName)) " +
        "ORDER BY COALESCE(n.publishedAt, n.writtenAt, n.createdAt) DESC")
    Page<JournalNote> search(@Param("q") String q,
                             @Param("kind") JournalNote.Kind kind,
                             @Param("status") JournalNote.Status status,
                             @Param("category") String category,
                             @Param("hasProblem") boolean hasProblem, @Param("problemId") UUID problemId,
                             @Param("hasTag") boolean hasTag, @Param("tagId") UUID tagId,
                             @Param("authorMode") int authorMode, @Param("authorId") UUID authorId,
                             @Param("authorName") String authorName,
                             Pageable pageable);

    Optional<JournalNote> findByExternalKey(String externalKey);

    long countByExternalKeyIsNotNull();

    /** [personId, displayName, name, authorName, notes] per author of notes written by someone else. */
    @Query("SELECT ap.id, ap.displayName, ap.name, n.authorName, COUNT(n) FROM JournalNote n LEFT JOIN n.authorPerson ap " +
           "WHERE ap.id IS NOT NULL OR n.authorName IS NOT NULL GROUP BY ap.id, ap.displayName, ap.name, n.authorName")
    List<Object[]> authorCounts();

    Optional<JournalNote> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @Query("SELECT DISTINCT n.category FROM JournalNote n WHERE n.kind = :kind AND n.category IS NOT NULL ORDER BY n.category")
    List<String> categories(@Param("kind") JournalNote.Kind kind);

    long countByProblemsId(UUID problemId);
    java.util.List<com.sonic.angels.model.entity.JournalNote> findBySeries(String series);
}
