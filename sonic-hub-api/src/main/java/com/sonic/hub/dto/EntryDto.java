package com.sonic.hub.dto;

import com.sonic.hub.model.EntryType;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

public class EntryDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private UUID id;
        private String entityType;
        private UUID entityId;
        private String content;
        private EntryType entryType;
        private UUID projectId;
        private String projectName;
        private Set<TagDto.Response> tags;
        private String createdBy;
        private LocalDateTime createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class Request {
        @NotBlank(message = "Entity type is required")
        private String entityType;

        private UUID entityId;

        @NotBlank(message = "Content is required")
        private String content;

        private EntryType entryType;
        private UUID projectId;
        private Set<UUID> tagIds;
        private String createdBy;
    }
}
