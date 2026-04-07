package com.sonic.hub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

public class WishlistDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private UUID id;
        private String title;
        private String description;
        private String category;
        private UUID projectId;
        private String projectName;
        private Set<TagDto.Response> tags;
        private boolean archived;
        private String createdBy;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class Request {
        @NotBlank(message = "Title is required")
        private String title;

        private String description;
        private String category;
        private UUID projectId;
        private Set<UUID> tagIds;
        private Boolean archived;
        private String createdBy;
    }
}
