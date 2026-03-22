package com.sonic.hub.repository;

import com.sonic.hub.model.Task;
import com.sonic.hub.model.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    List<Task> findByParentIsNullOrderByCreatedAtDesc();
    List<Task> findByParentIdOrderByCreatedAtDesc(UUID parentId);
    long countByParentId(UUID parentId);
    List<Task> findByParentIsNullAndStatusOrderByCreatedAtDesc(TaskStatus status);
    List<Task> findByProjectIdAndParentIsNullOrderByCreatedAtDesc(UUID projectId);

    // Recurring: find tasks due for regeneration
    @Query("SELECT t FROM Task t WHERE t.recurringConfig IS NOT NULL")
    List<Task> findAllRecurring();

    // Due today or overdue
    List<Task> findByDueDateLessThanEqualAndStatusNotOrderByDueDateAsc(
        LocalDate date, TaskStatus status);

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
