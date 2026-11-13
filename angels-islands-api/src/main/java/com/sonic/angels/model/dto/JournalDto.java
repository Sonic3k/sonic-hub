package com.sonic.angels.model.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class JournalDto {

    /** What a list of notes carries besides each note's own fields. Default none: a note then comes with its lead
     *  and its word count instead of its text. Consumers opt in per call (inclContent, inclTags, inclProblems).
     *  A single note (GET /notes/{id}, /notes/slug/{slug}) always comes whole. */
    public record Includes(boolean content, boolean tags, boolean problems) {
        public static Includes none() { return new Includes(false, false, false); }
        public static Includes all()  { return new Includes(true, true, true); }
    }

    public static class NoteRequest {
        private String title; private String content; private String mood;
        private List<UUID> problemIds; private List<UUID> tagIds;
        // article face — all optional; absent fields are left untouched on update
        private String kind; private String slug; private String excerpt; private UUID coverMediaId;
        private Boolean clearCover; private String category; private String status; private LocalDateTime publishedAt;
        // written by someone else — all optional; absent fields are left untouched on update
        private UUID authorPersonId; private String authorName; private Boolean clearAuthor;
        private LocalDateTime writtenAt; private Boolean clearWrittenAt; private String source;
        private String series; private Integer seriesOrder;
        public String getSeries() { return series; } public void setSeries(String v) { this.series = v; }
        public Integer getSeriesOrder() { return seriesOrder; } public void setSeriesOrder(Integer v) { this.seriesOrder = v; }
        public UUID getAuthorPersonId() { return authorPersonId; } public void setAuthorPersonId(UUID v) { this.authorPersonId = v; }
        public String getAuthorName() { return authorName; } public void setAuthorName(String v) { this.authorName = v; }
        public Boolean getClearAuthor() { return clearAuthor; } public void setClearAuthor(Boolean v) { this.clearAuthor = v; }
        public LocalDateTime getWrittenAt() { return writtenAt; } public void setWrittenAt(LocalDateTime v) { this.writtenAt = v; }
        public Boolean getClearWrittenAt() { return clearWrittenAt; } public void setClearWrittenAt(Boolean v) { this.clearWrittenAt = v; }
        public String getSource() { return source; } public void setSource(String v) { this.source = v; }
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
        private UUID authorPersonId; private String authorPersonName; private String authorName;
        private LocalDateTime writtenAt; private String source; private String externalKey;
        private String series; private Integer seriesOrder;
        public String getSeries() { return series; } public void setSeries(String v) { this.series = v; }
        public Integer getSeriesOrder() { return seriesOrder; } public void setSeriesOrder(Integer v) { this.seriesOrder = v; }
        private String lead; private Integer words;
        /** The beginning of the text as plain words (no markup, at most 400 characters): what a list shows of a note
         *  without carrying its whole text. Always present; the stored excerpt, when there is one, is in excerpt. */
        public String getLead() { return lead; } public void setLead(String v) { this.lead = v; }
        /** How many words the text has (for "n minutes to read"). */
        public Integer getWords() { return words; } public void setWords(Integer v) { this.words = v; }
        public UUID getAuthorPersonId() { return authorPersonId; } public void setAuthorPersonId(UUID v) { this.authorPersonId = v; }
        /** Display name of authorPerson. */
        public String getAuthorPersonName() { return authorPersonName; } public void setAuthorPersonName(String v) { this.authorPersonName = v; }
        public String getAuthorName() { return authorName; } public void setAuthorName(String v) { this.authorName = v; }
        public LocalDateTime getWrittenAt() { return writtenAt; } public void setWrittenAt(LocalDateTime v) { this.writtenAt = v; }
        public String getSource() { return source; } public void setSource(String v) { this.source = v; }
        public String getExternalKey() { return externalKey; } public void setExternalKey(String v) { this.externalKey = v; }
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

    public static class AuthorCount {
        private UUID personId; private String name; private long notes;
        public UUID getPersonId() { return personId; } public void setPersonId(UUID v) { this.personId = v; }
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public long getNotes() { return notes; } public void setNotes(long v) { this.notes = v; }
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

    /** One part of a series, for the list of parts and the previous / next links. */
    public static class SeriesPart {
        private UUID id; private String title; private Integer seriesOrder; private String slug;
        private UUID authorPersonId; private String authorPersonName; private String authorName; private LocalDateTime writtenAt;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public Integer getSeriesOrder() { return seriesOrder; } public void setSeriesOrder(Integer v) { this.seriesOrder = v; }
        public String getSlug() { return slug; } public void setSlug(String v) { this.slug = v; }
        public UUID getAuthorPersonId() { return authorPersonId; } public void setAuthorPersonId(UUID v) { this.authorPersonId = v; }
        public String getAuthorPersonName() { return authorPersonName; } public void setAuthorPersonName(String v) { this.authorPersonName = v; }
        public String getAuthorName() { return authorName; } public void setAuthorName(String v) { this.authorName = v; }
        public LocalDateTime getWrittenAt() { return writtenAt; } public void setWrittenAt(LocalDateTime v) { this.writtenAt = v; }
    }

    public static class SeriesSummary {
        private String series; private long parts; private LocalDateTime firstAt; private LocalDateTime lastAt;
        public String getSeries() { return series; } public void setSeries(String v) { this.series = v; }
        public long getParts() { return parts; } public void setParts(long v) { this.parts = v; }
        public LocalDateTime getFirstAt() { return firstAt; } public void setFirstAt(LocalDateTime v) { this.firstAt = v; }
        public LocalDateTime getLastAt() { return lastAt; } public void setLastAt(LocalDateTime v) { this.lastAt = v; }
    }
}
