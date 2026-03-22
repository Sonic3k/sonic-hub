package com.sonic.hub.repository;

import com.sonic.hub.model.Task;
import com.sonic.hub.model.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    // Root tasks (no parent)
    List<Task> findByParentIsNullOrderByCreatedAtDesc();

    // Children of a task
    List<Task> findByParentIdOrderByCreatedAtDesc(UUID parentId);

    // Count children
    long countByParentId(UUID parentId);

    // Root tasks filtered by status
    List<Task> findByParentIsNullAndStatusOrderByCreatedAtDesc(TaskStatus status);

    // Check circular reference: traverse up the tree
    @Query(value = """
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_id FROM tasks WHERE id = :parentId
            UNION ALL
            SELECT t.id, t.parent_id FROM tasks t
            INNER JOIN ancestors a ON t.id = a.parent_id
        )
        SELECT COUNT(*) > 0 FROM ancestors WHERE id = :taskId
        """, nativeQuery = true)
    boolean wouldCreateCycle(@Param("taskId") UUID taskId, @Param("parentId") UUID parentId);
}
