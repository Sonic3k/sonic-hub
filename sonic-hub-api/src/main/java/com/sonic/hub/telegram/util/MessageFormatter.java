package com.sonic.hub.telegram.util;

import com.sonic.hub.dto.ProblemDto;
import com.sonic.hub.dto.TaskDto;
import com.sonic.hub.dto.TodoDto;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

public class MessageFormatter {

    private MessageFormatter() {}

    public static String formatTaskList(List<TaskDto.Response> tasks) {
        if (tasks.isEmpty()) return "📭 No tasks found.";

        var sb = new StringBuilder("📋 *Tasks*\n\n");
        var idx = new AtomicInteger(1);
        tasks.forEach(t -> {
            String statusIcon = switch (t.getStatus()) {
                case OPEN -> "⬜";
                case IN_PROGRESS -> "🔵";
                case SNOOZED -> "😴";
                case DONE -> "✅";
                case CLOSED -> "⬛";
            };
            sb.append(String.format("%s %d. %s", statusIcon, idx.getAndIncrement(), escape(t.getTitle())));
            if (t.getProjectName() != null) sb.append(String.format(" 📁_%s_", escape(t.getProjectName())));
            if (t.getDueDate() != null) sb.append(String.format(" 📅%s", t.getDueDate()));
            sb.append(String.format("\n   `ID: %s`\n\n", shortId(t.getId().toString())));
        });
        return sb.toString();
    }

    public static String formatTodoList(List<TodoDto.Response> todos) {
        if (todos.isEmpty()) return "📭 No todos found.";

        var sb = new StringBuilder("☑️ *Todos*\n\n");
        var idx = new AtomicInteger(1);
        todos.forEach(t -> {
            String icon = t.isDone() ? "✅" : "⬜";
            sb.append(String.format("%s %d. %s", icon, idx.getAndIncrement(), escape(t.getTitle())));
            if (t.getProjectName() != null) sb.append(String.format(" 📁_%s_", escape(t.getProjectName())));
            sb.append(String.format("\n   `ID: %s`\n\n", shortId(t.getId().toString())));
        });
        return sb.toString();
    }

    public static String formatProblemList(List<ProblemDto.Response> problems) {
        if (problems.isEmpty()) return "📭 No problems found.";

        var sb = new StringBuilder("⚠️ *Problems*\n\n");
        var idx = new AtomicInteger(1);
        problems.forEach(p -> {
            String statusIcon = switch (p.getStatus()) {
                case NEW -> "🔴";
                case INVESTIGATING -> "🟡";
                case RESOLVED -> "🟢";
                case DISMISSED -> "⚫";
            };
            sb.append(String.format("%s %d. %s", statusIcon, idx.getAndIncrement(), escape(p.getTitle())));
            if (p.getProjectName() != null) sb.append(String.format(" 📁_%s_", escape(p.getProjectName())));
            sb.append(String.format("\n   `ID: %s`\n\n", shortId(p.getId().toString())));
        });
        return sb.toString();
    }

    public static String formatTaskCreated(TaskDto.Response task) {
        return String.format("✅ Task created: *%s*\n`ID: %s`", escape(task.getTitle()), shortId(task.getId().toString()));
    }

    public static String formatTodoCreated(TodoDto.Response todo) {
        return String.format("✅ Todo created: *%s*\n`ID: %s`", escape(todo.getTitle()), shortId(todo.getId().toString()));
    }

    public static String formatProblemCreated(ProblemDto.Response problem) {
        return String.format("✅ Problem logged: *%s*\n`ID: %s`", escape(problem.getTitle()), shortId(problem.getId().toString()));
    }

    /**
     * Show first 8 chars of UUID for display, but accept any prefix for lookup
     */
    public static String shortId(String uuid) {
        return uuid.length() >= 8 ? uuid.substring(0, 8) : uuid;
    }

    /**
     * Escape Markdown V1 special chars
     */
    public static String escape(String text) {
        if (text == null) return "";
        return text.replace("_", "\\_")
                   .replace("*", "\\*")
                   .replace("[", "\\[")
                   .replace("`", "\\`");
    }
}
