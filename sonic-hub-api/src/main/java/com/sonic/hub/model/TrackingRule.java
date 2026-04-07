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
    private String entityType;

    @Column(nullable = false)
    private UUID entityId;

    // ─── Habit tracking ───
    @Column(length = 20)
    private String frequencyType;

    private Integer currentLimit;
    private Integer targetLimit;

    // ─── Reminder scheduling (flexible) ───
    private Integer remindBeforeMinutes;     // 30 = remind 30min before entity dueDateTime

    private LocalDateTime remindAt;          // one-time exact reminder

    private Integer remindIntervalDays;      // every N days

    private String remindDaysOfWeek;         // "1,4" = Monday,Thursday (1=Mon 7=Sun)

    @Column(length = 10)
    private String remindTime;               // "08:00" = time of day for recurring

    @Column(columnDefinition = "TEXT")
    private String reminderMessage;

    private LocalDateTime lastRemindedAt;    // track last remind for interval calc

    @Column(columnDefinition = "boolean default true")
    @Builder.Default
    private Boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
