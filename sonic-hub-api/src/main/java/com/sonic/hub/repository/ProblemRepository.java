package com.sonic.hub.repository;

import com.sonic.hub.model.Problem;
import com.sonic.hub.model.ProblemStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProblemRepository extends JpaRepository<Problem, UUID> {
    List<Problem> findByProjectIsNullOrderByCreatedAtDesc();
    List<Problem> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
    List<Problem> findByStatusOrderByCreatedAtDesc(ProblemStatus status);
}
