package com.sonic.angels.repository;

import com.sonic.angels.model.entity.JournalNote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface JournalNoteRepository extends JpaRepository<JournalNote, UUID> {

    @Query("SELECT n FROM JournalNote n WHERE " +
        "(:q IS NULL OR LOWER(n.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(n.content) LIKE LOWER(CONCAT('%', :q, '%'))) " +
        "AND (:hasProblem = false OR EXISTS (SELECT 1 FROM JournalNote n2 JOIN n2.problems p WHERE n2.id = n.id AND p.id = :problemId)) " +
        "AND (:hasTag = false OR EXISTS (SELECT 1 FROM JournalNote n3 JOIN n3.tags t WHERE n3.id = n.id AND t.id = :tagId)) " +
        "ORDER BY n.createdAt DESC")
    Page<JournalNote> search(@Param("q") String q,
                             @Param("hasProblem") boolean hasProblem, @Param("problemId") UUID problemId,
                             @Param("hasTag") boolean hasTag, @Param("tagId") UUID tagId,
                             Pageable pageable);

    long countByProblemsId(UUID problemId);
}
