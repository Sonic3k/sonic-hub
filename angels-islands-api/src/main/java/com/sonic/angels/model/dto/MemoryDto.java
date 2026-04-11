package com.sonic.angels.model.dto;
import java.util.UUID;

import java.time.LocalDateTime;

public class MemoryDto {

    public static class FactRequest {
        private String category; private String key; private String value; private String period; private Float confidence;
        public String getCategory() { return category; } public void setCategory(String v) { this.category = v; }
        public String getKey() { return key; } public void setKey(String v) { this.key = v; }
        public String getValue() { return value; } public void setValue(String v) { this.value = v; }
        public String getPeriod() { return period; } public void setPeriod(String v) { this.period = v; }
        public Float getConfidence() { return confidence; } public void setConfidence(Float v) { this.confidence = v; }
    }
    public static class FactResponse extends FactRequest {
        private UUID id; private UUID sourceArchiveId; private LocalDateTime createdAt;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public UUID getSourceArchiveId() { return sourceArchiveId; } public void setSourceArchiveId(UUID v) { this.sourceArchiveId = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    }

    public static class EpisodeRequest {
        private String summary; private String emotion; private Integer importance; private LocalDateTime occurredAt;
        public String getSummary() { return summary; } public void setSummary(String v) { this.summary = v; }
        public String getEmotion() { return emotion; } public void setEmotion(String v) { this.emotion = v; }
        public Integer getImportance() { return importance; } public void setImportance(Integer v) { this.importance = v; }
        public LocalDateTime getOccurredAt() { return occurredAt; } public void setOccurredAt(LocalDateTime v) { this.occurredAt = v; }
    }
    public static class EpisodeResponse extends EpisodeRequest {
        private UUID id; private LocalDateTime createdAt;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    }

    public static class ChapterRequest {
        private String period; private String title; private String summary; private String sentiment; private Integer sortOrder;
        public String getPeriod() { return period; } public void setPeriod(String v) { this.period = v; }
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public String getSummary() { return summary; } public void setSummary(String v) { this.summary = v; }
        public String getSentiment() { return sentiment; } public void setSentiment(String v) { this.sentiment = v; }
        public Integer getSortOrder() { return sortOrder; } public void setSortOrder(Integer v) { this.sortOrder = v; }
    }
    public static class ChapterResponse extends ChapterRequest {
        private UUID id; private LocalDateTime createdAt;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    }

    public static class TraitRequest {
        private String trait; private String description; private String evidence; private String period;
        public String getTrait() { return trait; } public void setTrait(String v) { this.trait = v; }
        public String getDescription() { return description; } public void setDescription(String v) { this.description = v; }
        public String getEvidence() { return evidence; } public void setEvidence(String v) { this.evidence = v; }
        public String getPeriod() { return period; } public void setPeriod(String v) { this.period = v; }
    }
    public static class TraitResponse extends TraitRequest {
        private UUID id; private LocalDateTime createdAt;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    }
}
