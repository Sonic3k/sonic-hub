package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Problem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ProblemRepository extends JpaRepository<Problem, UUID> {

    List<Problem> findAllByOrderByCreatedAtDesc();

    /** Problem is the inverse (unmapped) side of the note join — clear by hand before delete. */
    @Modifying
    @Query(value = "DELETE FROM journal_note_problems WHERE problem_id = :problemId", nativeQuery = true)
    void clearNoteLinks(UUID problemId);
}
