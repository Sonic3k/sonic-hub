package com.sonic.hub.dto;

import com.sonic.hub.model.Priority;
import com.sonic.hub.model.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public class TaskDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private UUID id;
        private String title;
        private String description;
        private TaskStatus status;
        private Priority priority;
        private LocalDate dueDate;
        private LocalDateTime dueDateTime;
        private String duePeriod;
        private boolean someday;
        private UUID parentId;
        private long childCount;
        private UUID projectId;
        private String projectName;
        private Set<TagDto.Response> tags;
        private Map<String, Object> recurringConfig;
        private String createdBy;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class Request {
        @NotBlank(message = "Title is required")
        private String title;

        private String description;
        private TaskStatus status;
        private Priority priority;
        private LocalDate dueDate;
        private LocalDateTime dueDateTime;
        private String duePeriod;
        private Boolean someday;
        private UUID parentId;
        private UUID projectId;
        private Set<UUID> tagIds;
        private Map<String, Object> recurringConfig;
        private String createdBy;
        private String reminderPattern;
        private String reminderMessage;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class MoveRequest {
        private UUID parentId;
        private UUID projectId;
    }
}
