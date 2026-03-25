package com.sonic.hub.telegram.handler;

import com.sonic.hub.dto.ProblemDto;
import com.sonic.hub.dto.TaskDto;
import com.sonic.hub.dto.TodoDto;
import com.sonic.hub.service.ProblemService;
import com.sonic.hub.service.TaskService;
import com.sonic.hub.service.TodoService;
import com.sonic.hub.telegram.util.MessageFormatter;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.objects.message.Message;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class EditCommandHandler implements CommandHandler {

    private final TaskService taskService;
    private final TodoService todoService;
    private final ProblemService problemService;
    private final EntityManager entityManager;

    @Override
    public boolean supports(String command) {
        return "/edit".equals(command);
    }

    @Override
    public String handle(Message message, String command, String args) {
        if (args == null || args.isBlank()) {
            return "❌ Usage: `/edit t <id> New title`\n"
                 + "Types: `t` (task), `td` (todo), `p` (problem)";
        }

        String[] parts = args.split("\\s+", 3);
        if (parts.length < 3) {
            return "❌ Usage: `/edit t <id> New title`";
        }

        String type = parts[0];
        String shortId = parts[1];
        String newTitle = parts[2].trim();

        if (newTitle.isBlank()) {
            return "❌ New title cannot be empty.";
        }

        return switch (type) {
            case "t" -> editTask(shortId, newTitle);
            case "td" -> editTodo(shortId, newTitle);
            case "p" -> editProblem(shortId, newTitle);
            default -> "❌ Unknown type `" + type + "`. Use `t`, `td`, or `p`.";
        };
    }

    private String editTask(String shortId, String newTitle) {
        UUID id = resolveId("tasks", shortId);
        if (id == null) return "❌ Task not found with ID starting with `" + shortId + "`";

        var existing = taskService.getById(id);
        var request = new TaskDto.Request();
        request.setTitle(newTitle);
        request.setStatus(existing.getStatus());
        request.setPriority(existing.getPriority());
        request.setDueDate(existing.getDueDate());
        request.setProjectId(existing.getProjectId());

        var updated = taskService.update(id, request);
        return String.format("✏️ Task updated: *%s*\n`ID: %s`",
                MessageFormatter.escape(updated.getTitle()),
                MessageFormatter.shortId(id.toString()));
    }

    private String editTodo(String shortId, String newTitle) {
        UUID id = resolveId("todos", shortId);
        if (id == null) return "❌ Todo not found with ID starting with `" + shortId + "`";

        var existing = todoService.getById(id);
        var request = new TodoDto.Request();
        request.setTitle(newTitle);
        request.setProjectId(existing.getProjectId());

        var updated = todoService.update(id, request);
        return String.format("✏️ Todo updated: *%s*\n`ID: %s`",
                MessageFormatter.escape(updated.getTitle()),
                MessageFormatter.shortId(id.toString()));
    }

    private String editProblem(String shortId, String newTitle) {
        UUID id = resolveId("problems", shortId);
        if (id == null) return "❌ Problem not found with ID starting with `" + shortId + "`";

        var existing = problemService.getById(id);
        var request = new ProblemDto.Request();
        request.setTitle(newTitle);
        request.setStatus(existing.getStatus());
        request.setNote(existing.getNote());
        request.setProjectId(existing.getProjectId());

        var updated = problemService.update(id, request);
        return String.format("✏️ Problem updated: *%s*\n`ID: %s`",
                MessageFormatter.escape(updated.getTitle()),
                MessageFormatter.shortId(id.toString()));
    }

    /**
     * Resolve a short ID prefix to a full UUID by querying the DB.
     */
    @SuppressWarnings("unchecked")
    private UUID resolveId(String table, String shortId) {
        try {
            List<UUID> results = entityManager
                    .createNativeQuery("SELECT id FROM " + table + " WHERE CAST(id AS text) LIKE :prefix", UUID.class)
                    .setParameter("prefix", shortId + "%")
                    .setMaxResults(1)
                    .getResultList();
            return results.isEmpty() ? null : results.get(0);
        } catch (Exception e) {
            log.error("Failed to resolve short ID: {}", shortId, e);
            return null;
        }
    }
}
