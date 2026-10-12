package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@MappedSuperclass
public abstract class BaseEntity {

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = clock();
        updatedAt = clock();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = clock();
    }

    /** The wall clock behind the two stamps: the server's own zone, unless an entity says otherwise. */
    protected LocalDateTime clock() { return LocalDateTime.now(); }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
