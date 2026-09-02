package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/** A tracked life problem; journal notes link to it so its whole history reads as a timeline. */
@Entity
@Table(name = "problems")
public class Problem extends BaseEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Free string (OPEN / TRACKING / RESOLVED / anything). Deliberately not an enum. */
    @Column(name = "status", nullable = false)
    private String status = "OPEN";

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
}
