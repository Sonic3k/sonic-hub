package com.sonic.hub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

public class TodoDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private UUID id;
        private String title;
        private boolean done;
        private UUID projectId;
        private String projectName;
        private Set<TagDto.Response> tags;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class Request {
        @NotBlank(message = "Title is required")
        private String title;

        private UUID projectId;
        private Set<UUID> tagIds;
    }
}
