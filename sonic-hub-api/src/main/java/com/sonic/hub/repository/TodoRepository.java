package com.sonic.hub.repository;

import com.sonic.hub.model.Todo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TodoRepository extends JpaRepository<Todo, UUID> {
    List<Todo> findByProjectIsNullOrderByCreatedAtDesc();
    List<Todo> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
    List<Todo> findByDoneOrderByCreatedAtDesc(boolean done);
}
