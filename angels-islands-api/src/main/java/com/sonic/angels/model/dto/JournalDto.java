package com.sonic.angels.model.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class JournalDto {

    public static class NoteRequest {
        private String title; private String content; private String mood;
        private List<UUID> problemIds; private List<UUID> tagIds;
        // article face — all optional; absent fields are left untouched on update
        private String kind; private String slug; private String excerpt; private UUID coverMediaId;
        private Boolean clearCover; private String category; private String status; private LocalDateTime publishedAt;
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public String getContent() { return content; } public void setContent(String v) { this.content = v; }
        public String getMood() { return mood; } public void setMood(String v) { this.mood = v; }
        public List<UUID> getProblemIds() { return problemIds; } public void setProblemIds(List<UUID> v) { this.problemIds = v; }
        public List<UUID> getTagIds() { return tagIds; } public void setTagIds(List<UUID> v) { this.tagIds = v; }
        public String getKind() { return kind; } public void setKind(String v) { this.kind = v; }
        public String getSlug() { return slug; } public void setSlug(String v) { this.slug = v; }
        public String getExcerpt() { return excerpt; } public void setExcerpt(String v) { this.excerpt = v; }
        public UUID getCoverMediaId() { return coverMediaId; } public void setCoverMediaId(UUID v) { this.coverMediaId = v; }
        public Boolean getClearCover() { return clearCover; } public void setClearCover(Boolean v) { this.clearCover = v; }
        public String getCategory() { return category; } public void setCategory(String v) { this.category = v; }
        public String getStatus() { return status; } public void setStatus(String v) { this.status = v; }
        public LocalDateTime getPublishedAt() { return publishedAt; } public void setPublishedAt(LocalDateTime v) { this.publishedAt = v; }
    }

    public static class NoteResponse {
        private UUID id; private String title; private String content; private String mood;
        private LocalDateTime createdAt; private LocalDateTime updatedAt;
        private Set<TagDto.Response> tags; private List<ProblemResponse> problems;
        private String kind; private String slug; private String excerpt; private MediaFileDto.Response coverMedia;
        private String category; private String status; private LocalDateTime publishedAt;
        public String getKind() { return kind; } public void setKind(String v) { this.kind = v; }
        public String getSlug() { return slug; } public void setSlug(String v) { this.slug = v; }
        public String getExcerpt() { return excerpt; } public void setExcerpt(String v) { this.excerpt = v; }
        public MediaFileDto.Response getCoverMedia() { return coverMedia; } public void setCoverMedia(MediaFileDto.Response v) { this.coverMedia = v; }
        public String getCategory() { return category; } public void setCategory(String v) { this.category = v; }
        public String getStatus() { return status; } public void setStatus(String v) { this.status = v; }
        public LocalDateTime getPublishedAt() { return publishedAt; } public void setPublishedAt(LocalDateTime v) { this.publishedAt = v; }
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public String getContent() { return content; } public void setContent(String v) { this.content = v; }
        public String getMood() { return mood; } public void setMood(String v) { this.mood = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
        public LocalDateTime getUpdatedAt() { return updatedAt; } public void setUpdatedAt(LocalDateTime v) { this.updatedAt = v; }
        public Set<TagDto.Response> getTags() { return tags; } public void setTags(Set<TagDto.Response> v) { this.tags = v; }
        public List<ProblemResponse> getProblems() { return problems; } public void setProblems(List<ProblemResponse> v) { this.problems = v; }
    }

    public static class ProblemRequest {
        private String title; private String description; private String status;
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public String getDescription() { return description; } public void setDescription(String v) { this.description = v; }
        public String getStatus() { return status; } public void setStatus(String v) { this.status = v; }
    }

    public static class ProblemResponse {
        private UUID id; private String title; private String description; private String status;
        private LocalDateTime resolvedAt; private LocalDateTime createdAt; private Long noteCount;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public String getDescription() { return description; } public void setDescription(String v) { this.description = v; }
        public String getStatus() { return status; } public void setStatus(String v) { this.status = v; }
        public LocalDateTime getResolvedAt() { return resolvedAt; } public void setResolvedAt(LocalDateTime v) { this.resolvedAt = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
        public Long getNoteCount() { return noteCount; } public void setNoteCount(Long v) { this.noteCount = v; }
    }
}
