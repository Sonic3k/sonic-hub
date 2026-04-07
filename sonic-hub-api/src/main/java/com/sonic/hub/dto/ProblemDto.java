package com.sonic.hub.dto;

import com.sonic.hub.model.ProblemStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

public class ProblemDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private UUID id;
        private String title;
        private String note;
        private ProblemStatus status;
        private UUID projectId;
        private String projectName;
        private Set<TagDto.Response> tags;
        private String createdBy;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class Request {
        @NotBlank(message = "Title is required")
        private String title;

        private String note;
        private ProblemStatus status;
        private UUID projectId;
        private Set<UUID> tagIds;
        private String createdBy;
        private String frequencyType;
        private Integer currentLimit;
        private Integer targetLimit;
        private String reminderPattern;
        private String reminderMessage;
    }
}
