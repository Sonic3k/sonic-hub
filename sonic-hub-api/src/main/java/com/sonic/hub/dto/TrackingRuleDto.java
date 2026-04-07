package com.sonic.hub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

public class TrackingRuleDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private UUID id;
        private String entityType;
        private UUID entityId;
        private String frequencyType;
        private Integer currentLimit;
        private Integer targetLimit;
        private Integer remindBeforeMinutes;
        private LocalDateTime remindAt;
        private Integer remindIntervalDays;
        private String remindDaysOfWeek;
        private String remindTime;
        private String reminderMessage;
        private LocalDateTime lastRemindedAt;
        private boolean active;
        private UUID projectId;
        private String projectName;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class Request {
        @NotBlank(message = "Entity type is required")
        private String entityType;

        private UUID entityId;
        private String frequencyType;
        private Integer currentLimit;
        private Integer targetLimit;
        private Integer remindBeforeMinutes;
        private LocalDateTime remindAt;
        private Integer remindIntervalDays;
        private String remindDaysOfWeek;
        private String remindTime;
        private String reminderMessage;
        private Boolean active;
        private UUID projectId;
    }
}
