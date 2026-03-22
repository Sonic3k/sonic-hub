package com.sonic.hub.dto;

import com.sonic.hub.model.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

public class TaskDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private UUID id;
        private String title;
        private String description;
        private TaskStatus status;
        private UUID parentId;
        private long childCount;
        private Set<TagDto.Response> tags;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {
        @NotBlank(message = "Title is required")
        private String title;

        private String description;
        private TaskStatus status;
        private UUID parentId;
        private Set<UUID> tagIds;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MoveRequest {
        private UUID parentId; // null = move to root
    }
}
