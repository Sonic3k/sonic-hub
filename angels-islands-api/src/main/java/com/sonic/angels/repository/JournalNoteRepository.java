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
    @Query("SELECT n FROM JournalNote n WHERE " +
        "(:q IS NULL OR LOWER(n.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(n.content) LIKE LOWER(CONCAT('%', :q, '%'))) " +
        "AND (:kind IS NULL OR n.kind = :kind) " +
        "AND (:status IS NULL OR n.status = :status) " +
        "AND (:category IS NULL OR n.category = :category) " +
        "AND (:hasProblem = false OR EXISTS (SELECT 1 FROM JournalNote n2 JOIN n2.problems p WHERE n2.id = n.id AND p.id = :problemId)) " +
        "AND (:hasTag = false OR EXISTS (SELECT 1 FROM JournalNote n3 JOIN n3.tags t WHERE n3.id = n.id AND t.id = :tagId)) " +
        "ORDER BY COALESCE(n.publishedAt, n.createdAt) DESC")
    Page<JournalNote> search(@Param("q") String q,
                             @Param("kind") JournalNote.Kind kind,
                             @Param("status") JournalNote.Status status,
                             @Param("category") String category,
                             @Param("hasProblem") boolean hasProblem, @Param("problemId") UUID problemId,
                             @Param("hasTag") boolean hasTag, @Param("tagId") UUID tagId,
                             Pageable pageable);

    Optional<JournalNote> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @Query("SELECT DISTINCT n.category FROM JournalNote n WHERE n.kind = :kind AND n.category IS NOT NULL ORDER BY n.category")
    List<String> categories(@Param("kind") JournalNote.Kind kind);

    long countByProblemsId(UUID problemId);
}
