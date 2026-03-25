package com.sonic.connector.telegram.handler;

import com.sonic.connector.core.ApiModels.*;
import com.sonic.connector.core.SonicHubApiClient;
import com.sonic.connector.telegram.util.MessageFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.objects.message.Message;

import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class EditCommandHandler implements CommandHandler {

    private final SonicHubApiClient apiClient;

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
        var fullId = resolveId(apiClient.getTasks().stream().map(TaskResponse::getId).toList(), shortId);
        if (fullId == null) return "❌ Task not found with ID starting with `" + shortId + "`";

        var existing = apiClient.getTask(fullId);
        var request = TaskRequest.builder()
                .title(newTitle)
                .status(existing.getStatus())
                .priority(existing.getPriority())
                .dueDate(existing.getDueDate())
                .projectId(existing.getProjectId())
                .build();

        var updated = apiClient.updateTask(fullId, request);
        return String.format("✏️ Task updated: *%s*\n`ID: %s`",
                MessageFormatter.escape(updated.getTitle()),
                MessageFormatter.shortId(fullId));
    }

    private String editTodo(String shortId, String newTitle) {
        var fullId = resolveId(apiClient.getTodos().stream().map(TodoResponse::getId).toList(), shortId);
        if (fullId == null) return "❌ Todo not found with ID starting with `" + shortId + "`";

        var existing = apiClient.getTodo(fullId);
        var request = TodoRequest.builder()
                .title(newTitle)
                .projectId(existing.getProjectId())
                .build();

        var updated = apiClient.updateTodo(fullId, request);
        return String.format("✏️ Todo updated: *%s*\n`ID: %s`",
                MessageFormatter.escape(updated.getTitle()),
                MessageFormatter.shortId(fullId));
    }

    private String editProblem(String shortId, String newTitle) {
        var fullId = resolveId(apiClient.getProblems().stream().map(ProblemResponse::getId).toList(), shortId);
        if (fullId == null) return "❌ Problem not found with ID starting with `" + shortId + "`";

        var existing = apiClient.getProblem(fullId);
        var request = ProblemRequest.builder()
                .title(newTitle)
                .status(existing.getStatus())
                .note(existing.getNote())
                .projectId(existing.getProjectId())
                .build();

        var updated = apiClient.updateProblem(fullId, request);
        return String.format("✏️ Problem updated: *%s*\n`ID: %s`",
                MessageFormatter.escape(updated.getTitle()),
                MessageFormatter.shortId(fullId));
    }

    private String resolveId(List<String> ids, String prefix) {
        return ids.stream()
                .filter(id -> id.startsWith(prefix))
                .findFirst()
                .orElse(null);
    }
}
