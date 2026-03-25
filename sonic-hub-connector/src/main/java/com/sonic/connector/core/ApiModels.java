package com.sonic.connector.core;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

public class ApiModels {

    // ── Task ──
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TaskResponse {
        private String id;
        private String title;
        private String description;
        private String status;
        private String priority;
        private LocalDate dueDate;
        private String parentId;
        private long childCount;
        private String projectId;
        private String projectName;
        private Set<TagResponse> tags;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TaskRequest {
        private String title;
        private String status;
        private String priority;
        private LocalDate dueDate;
        private String parentId;
        private String projectId;
    }

    // ── Todo ──
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TodoResponse {
        private String id;
        private String title;
        private boolean done;
        private String projectId;
        private String projectName;
        private Set<TagResponse> tags;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TodoRequest {
        private String title;
        private String projectId;
    }

    // ── Problem ──
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ProblemResponse {
        private String id;
        private String title;
        private String note;
        private String status;
        private String projectId;
        private String projectName;
        private Set<TagResponse> tags;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ProblemRequest {
        private String title;
        private String note;
        private String status;
        private String projectId;
    }

    // ── Tag ──
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class TagResponse {
        private String id;
        private String name;
        private String color;
    }
}
