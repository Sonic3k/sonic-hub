package com.sonic.angels.model.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class PersonReportDto {
    private UUID id; private String source; private String title; private String content; private LocalDateTime updatedAt;
    public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
    public String getSource() { return source; } public void setSource(String v) { this.source = v; }
    public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
    public String getContent() { return content; } public void setContent(String v) { this.content = v; }
    public LocalDateTime getUpdatedAt() { return updatedAt; } public void setUpdatedAt(LocalDateTime v) { this.updatedAt = v; }
}
