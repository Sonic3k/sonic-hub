package com.sonic.hub.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tracking_rules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TrackingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 20)
    private String entityType;  // "task", "problem", "todo"

    @Column(nullable = false)
    private UUID entityId;

    @Column(length = 20)
    private String frequencyType;  // "daily", "weekly", "monthly"

    private Integer currentLimit;  // current allowed count per period

    private Integer targetLimit;   // goal to reduce to

    @Column(length = 50)
    private String reminderPattern;  // "daily_morning", "every_3_days", "weekly_checkin", "before_deadline"

    @Column(columnDefinition = "TEXT")
    private String reminderMessage;  // specific tip/message to repeat

    @Builder.Default
    private boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
