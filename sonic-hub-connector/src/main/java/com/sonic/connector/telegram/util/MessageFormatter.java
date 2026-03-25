package com.sonic.connector.telegram.util;

import com.sonic.connector.core.ApiModels.*;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

public class MessageFormatter {

    private MessageFormatter() {}

    public static String formatTaskList(List<TaskResponse> tasks) {
        if (tasks.isEmpty()) return "📭 No tasks found.";

        var sb = new StringBuilder("📋 *Tasks*\n\n");
        var idx = new AtomicInteger(1);
        tasks.forEach(t -> {
            String statusIcon = switch (t.getStatus()) {
                case "OPEN" -> "⬜";
                case "IN_PROGRESS" -> "🔵";
                case "SNOOZED" -> "😴";
                case "DONE" -> "✅";
                case "CLOSED" -> "⬛";
                default -> "❓";
            };
            sb.append(String.format("%s %d. %s", statusIcon, idx.getAndIncrement(), escape(t.getTitle())));
            if (t.getProjectName() != null) sb.append(String.format(" 📁_%s_", escape(t.getProjectName())));
            if (t.getDueDate() != null) sb.append(String.format(" 📅%s", t.getDueDate()));
            sb.append(String.format("\n   `ID: %s`\n\n", shortId(t.getId())));
        });
        return sb.toString();
    }

    public static String formatTodoList(List<TodoResponse> todos) {
        if (todos.isEmpty()) return "📭 No todos found.";

        var sb = new StringBuilder("☑️ *Todos*\n\n");
        var idx = new AtomicInteger(1);
        todos.forEach(t -> {
            String icon = t.isDone() ? "✅" : "⬜";
            sb.append(String.format("%s %d. %s", icon, idx.getAndIncrement(), escape(t.getTitle())));
            if (t.getProjectName() != null) sb.append(String.format(" 📁_%s_", escape(t.getProjectName())));
            sb.append(String.format("\n   `ID: %s`\n\n", shortId(t.getId())));
        });
        return sb.toString();
    }

    public static String formatProblemList(List<ProblemResponse> problems) {
        if (problems.isEmpty()) return "📭 No problems found.";

        var sb = new StringBuilder("⚠️ *Problems*\n\n");
        var idx = new AtomicInteger(1);
        problems.forEach(p -> {
            String statusIcon = switch (p.getStatus()) {
                case "NEW" -> "🔴";
                case "INVESTIGATING" -> "🟡";
                case "RESOLVED" -> "🟢";
                case "DISMISSED" -> "⚫";
                default -> "❓";
            };
            sb.append(String.format("%s %d. %s", statusIcon, idx.getAndIncrement(), escape(p.getTitle())));
            if (p.getProjectName() != null) sb.append(String.format(" 📁_%s_", escape(p.getProjectName())));
            sb.append(String.format("\n   `ID: %s`\n\n", shortId(p.getId())));
        });
        return sb.toString();
    }

    public static String formatTaskCreated(TaskResponse task) {
        return String.format("✅ Task created: *%s*\n`ID: %s`", escape(task.getTitle()), shortId(task.getId()));
    }

    public static String formatTodoCreated(TodoResponse todo) {
        return String.format("✅ Todo created: *%s*\n`ID: %s`", escape(todo.getTitle()), shortId(todo.getId()));
    }

    public static String formatProblemCreated(ProblemResponse problem) {
        return String.format("✅ Problem logged: *%s*\n`ID: %s`", escape(problem.getTitle()), shortId(problem.getId()));
    }

    public static String shortId(String uuid) {
        return uuid != null && uuid.length() >= 8 ? uuid.substring(0, 8) : uuid;
    }

    public static String escape(String text) {
        if (text == null) return "";
        return text.replace("_", "\\_")
                   .replace("*", "\\*")
                   .replace("[", "\\[")
                   .replace("`", "\\`");
    }
}
