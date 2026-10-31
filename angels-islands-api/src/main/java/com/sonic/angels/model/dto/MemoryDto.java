package com.sonic.angels.model.dto;
import java.util.UUID;

import java.time.LocalDateTime;

public class MemoryDto {

    public static class FactRequest {
        private String source;
        public String getSource() { return source; } public void setSource(String v) { this.source = v; }
        /** DRAFT | CONFIRMED */
        private String status;
        public String getStatus() { return status; } public void setStatus(String v) { this.status = v; }
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
        private String source;
        public String getSource() { return source; } public void setSource(String v) { this.source = v; }
        /** DRAFT | CONFIRMED */
        private String status;
        public String getStatus() { return status; } public void setStatus(String v) { this.status = v; }
        private String summary; private String emotion; private Integer importance; private LocalDateTime occurredAt;
        public String getSummary() { return summary; } public void setSummary(String v) { this.summary = v; }
        public String getEmotion() { return emotion; } public void setEmotion(String v) { this.emotion = v; }
        public Integer getImportance() { return importance; } public void setImportance(Integer v) { this.importance = v; }
        public LocalDateTime getOccurredAt() { return occurredAt; } public void setOccurredAt(LocalDateTime v) { this.occurredAt = v; }
        /** title, kind (MOMENT, MILESTONE, TRIP…), precision of occurredAt (DECADE | YEAR | SEASON | MONTH | DAY…), approx = "khoảng",
         *  endAt for a memory that lasted, place with optional coordinates, externalKey = the importer's stable name. */
        private String title; private String kind; private String precision; private Boolean approx; private LocalDateTime endAt;
        private String place; private Double latitude; private Double longitude; private String externalKey;
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public String getKind() { return kind; } public void setKind(String v) { this.kind = v; }
        public String getPrecision() { return precision; } public void setPrecision(String v) { this.precision = v; }
        public Boolean getApprox() { return approx; } public void setApprox(Boolean v) { this.approx = v; }
        public LocalDateTime getEndAt() { return endAt; } public void setEndAt(LocalDateTime v) { this.endAt = v; }
        public String getPlace() { return place; } public void setPlace(String v) { this.place = v; }
        public Double getLatitude() { return latitude; } public void setLatitude(Double v) { this.latitude = v; }
        public Double getLongitude() { return longitude; } public void setLongitude(Double v) { this.longitude = v; }
        public String getExternalKey() { return externalKey; } public void setExternalKey(String v) { this.externalKey = v; }
        /** Links. In an update: a list left out (null) keeps what is there, an empty list clears it. mediaIds keep their order (cover first). */
        private java.util.List<UUID> mediaIds; private java.util.List<UUID> collectionIds; private java.util.List<UUID> tagIds; private java.util.List<UUID> personIds;
        public java.util.List<UUID> getMediaIds() { return mediaIds; } public void setMediaIds(java.util.List<UUID> v) { this.mediaIds = v; }
        public java.util.List<UUID> getCollectionIds() { return collectionIds; } public void setCollectionIds(java.util.List<UUID> v) { this.collectionIds = v; }
        public java.util.List<UUID> getTagIds() { return tagIds; } public void setTagIds(java.util.List<UUID> v) { this.tagIds = v; }
        public java.util.List<UUID> getPersonIds() { return personIds; } public void setPersonIds(java.util.List<UUID> v) { this.personIds = v; }
    }
    public static class EpisodeResponse extends EpisodeRequest {
        private UUID id; private LocalDateTime createdAt; private String when;
        private java.util.List<MediaRef> media; private java.util.List<CollectionRef> collections;
        private java.util.List<TagDto.Response> tags; private java.util.List<PersonDto.Summary> persons;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
        /** occurredAt written as far as it is known: "1995", "Hè 1998", "1998-06", "2005-07-15" */
        public String getWhen() { return when; } public void setWhen(String v) { this.when = v; }
        public java.util.List<MediaRef> getMedia() { return media; } public void setMedia(java.util.List<MediaRef> v) { this.media = v; }
        public java.util.List<CollectionRef> getCollections() { return collections; } public void setCollections(java.util.List<CollectionRef> v) { this.collections = v; }
        public java.util.List<TagDto.Response> getTags() { return tags; } public void setTags(java.util.List<TagDto.Response> v) { this.tags = v; }
        public java.util.List<PersonDto.Summary> getPersons() { return persons; } public void setPersons(java.util.List<PersonDto.Summary> v) { this.persons = v; }
    }

    /** A photo of a memory, as much as a list needs. */
    public static class MediaRef {
        private UUID id; private String fileName; private String url; private String caption; private Integer width; private Integer height;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public String getFileName() { return fileName; } public void setFileName(String v) { this.fileName = v; }
        public String getUrl() { return url; } public void setUrl(String v) { this.url = v; }
        public String getCaption() { return caption; } public void setCaption(String v) { this.caption = v; }
        public Integer getWidth() { return width; } public void setWidth(Integer v) { this.width = v; }
        public Integer getHeight() { return height; } public void setHeight(Integer v) { this.height = v; }
    }
    public static class CollectionRef {
        private UUID id; private String name;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public String getName() { return name; } public void setName(String v) { this.name = v; }
    }

    /** One memory picked at random: type = episode | fact | chapter | trait, and that one item. */
    public static class RandomItem {
        private String type; private EpisodeResponse episode; private FactResponse fact; private ChapterResponse chapter; private TraitResponse trait;
        public String getType() { return type; } public void setType(String v) { this.type = v; }
        public EpisodeResponse getEpisode() { return episode; } public void setEpisode(EpisodeResponse v) { this.episode = v; }
        public FactResponse getFact() { return fact; } public void setFact(FactResponse v) { this.fact = v; }
        public ChapterResponse getChapter() { return chapter; } public void setChapter(ChapterResponse v) { this.chapter = v; }
        public TraitResponse getTrait() { return trait; } public void setTrait(TraitResponse v) { this.trait = v; }
    }

    public static class ChapterRequest {
        private String source;
        public String getSource() { return source; } public void setSource(String v) { this.source = v; }
        /** DRAFT | CONFIRMED */
        private String status;
        public String getStatus() { return status; } public void setStatus(String v) { this.status = v; }
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
        private String source;
        public String getSource() { return source; } public void setSource(String v) { this.source = v; }
        /** DRAFT | CONFIRMED */
        private String status;
        public String getStatus() { return status; } public void setStatus(String v) { this.status = v; }
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

    /** Replaces every memory item of one source for one person; a list left out (null) is not touched. */
    public static class SourceImport {
        private java.util.List<ChapterRequest> chapters; private java.util.List<FactRequest> facts;
        private java.util.List<TraitRequest> traits; private java.util.List<EpisodeRequest> episodes;
        public java.util.List<ChapterRequest> getChapters() { return chapters; } public void setChapters(java.util.List<ChapterRequest> v) { this.chapters = v; }
        public java.util.List<FactRequest> getFacts() { return facts; } public void setFacts(java.util.List<FactRequest> v) { this.facts = v; }
        public java.util.List<TraitRequest> getTraits() { return traits; } public void setTraits(java.util.List<TraitRequest> v) { this.traits = v; }
        public java.util.List<EpisodeRequest> getEpisodes() { return episodes; } public void setEpisodes(java.util.List<EpisodeRequest> v) { this.episodes = v; }
    }
}
