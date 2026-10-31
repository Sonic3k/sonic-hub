package com.sonic.angels.model.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;
import java.time.LocalDateTime;

@Entity
@Table(name = "episodes", indexes = {
    @Index(name = "idx_episode_person", columnList = "person_id"),
    @Index(name = "idx_episode_importance", columnList = "importance"),
    @Index(name = "idx_episode_occurred", columnList = "occurred_at"),
    @Index(name = "idx_episode_external_key", columnList = "external_key")
})
public class Episode extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnore
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @Column(name = "summary", columnDefinition = "TEXT", nullable = false)
    private String summary;

    @Column(name = "emotion")
    private String emotion;

    @Column(name = "importance")
    private Integer importance = 5; // 1-10

    @Column(name = "occurred_at")
    private LocalDateTime occurredAt;

    @Column(name = "source_archive_id")
    private UUID sourceArchiveId;

    /** Where this memory came from: null = typed in by hand, "analysis" = the chat analysis import. */
    @Column(name = "source", length = 40)
    private String source;

    /** What kind of memory: MOMENT, MILESTONE, TRIP, CREATION, KEEPSAKE, DOCUMENT, PLACE… (free text; null = not sorted). */
    @Column(name = "kind", length = 30)
    private String kind;

    @Column(name = "title", length = 300)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private MemoryStatus status;

    /** How far occurredAt is known (occurredAt is then the start of that span: 1995-01-01 for "1995"). */
    @Enumerated(EnumType.STRING)
    @Column(name = "occurred_precision", length = 10)
    private DatePrecision occurredPrecision;

    @Column(name = "occurred_approx")
    private Boolean occurredApprox;

    /** Last day of a memory that lasted (a trip, a school year); null for a single moment. */
    @Column(name = "end_at")
    private LocalDateTime endAt;

    @Column(name = "place", length = 300)
    private String place;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    /** The importer's own stable name for this memory ("trip-1995-sai-gon-da-lat"): the row id changes on a re-import, this does not. */
    @Column(name = "external_key", length = 160)
    private String externalKey;

    /** The photos / scans of this memory, the cover first. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "episode_media",
        joinColumns = @JoinColumn(name = "episode_id"),
        inverseJoinColumns = @JoinColumn(name = "media_file_id"))
    @OrderColumn(name = "position")
    @BatchSize(size = 200)
    private List<MediaFile> mediaFiles = new ArrayList<>();

    /** Whole albums that belong to it (a trip's album). */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "episode_collections",
        joinColumns = @JoinColumn(name = "episode_id"),
        inverseJoinColumns = @JoinColumn(name = "collection_id"))
    @BatchSize(size = 200)
    private Set<Collection> collections = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "episode_tags",
        joinColumns = @JoinColumn(name = "episode_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @BatchSize(size = 200)
    private Set<Tag> tags = new HashSet<>();

    /** Who else was in it (the owner of the memory is {@link #person}). */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "episode_persons",
        joinColumns = @JoinColumn(name = "episode_id"),
        inverseJoinColumns = @JoinColumn(name = "person_id"))
    @BatchSize(size = 200)
    private Set<Person> persons = new HashSet<>();

    public Episode() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getEmotion() { return emotion; }
    public void setEmotion(String emotion) { this.emotion = emotion; }
    public Integer getImportance() { return importance; }
    public void setImportance(Integer importance) { this.importance = importance; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
    public UUID getSourceArchiveId() { return sourceArchiveId; }
    public void setSourceArchiveId(UUID sourceArchiveId) { this.sourceArchiveId = sourceArchiveId; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public MemoryStatus getStatus() { return status; }
    public void setStatus(MemoryStatus status) { this.status = status; }
    public DatePrecision getOccurredPrecision() { return occurredPrecision; }
    public void setOccurredPrecision(DatePrecision occurredPrecision) { this.occurredPrecision = occurredPrecision; }
    public Boolean getOccurredApprox() { return occurredApprox; }
    public void setOccurredApprox(Boolean occurredApprox) { this.occurredApprox = occurredApprox; }
    public LocalDateTime getEndAt() { return endAt; }
    public void setEndAt(LocalDateTime endAt) { this.endAt = endAt; }
    public String getPlace() { return place; }
    public void setPlace(String place) { this.place = place; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String externalKey) { this.externalKey = externalKey; }
    public List<MediaFile> getMediaFiles() { return mediaFiles; }
    public void setMediaFiles(List<MediaFile> mediaFiles) { this.mediaFiles = mediaFiles; }
    public Set<Collection> getCollections() { return collections; }
    public void setCollections(Set<Collection> collections) { this.collections = collections; }
    public Set<Tag> getTags() { return tags; }
    public void setTags(Set<Tag> tags) { this.tags = tags; }
    public Set<Person> getPersons() { return persons; }
    public void setPersons(Set<Person> persons) { this.persons = persons; }

    /** occurredAt written as far as it is known: "1990s", "1995", "Hè 1998", "1998-06", "2005-07-15" ("~" in front when approximate). */
    public String whenText() {
        if (occurredAt == null) return null;
        DatePrecision p = occurredPrecision == null ? DatePrecision.DAY : occurredPrecision;
        String d = occurredAt.toLocalDate().toString();
        String t = switch (p) {
            case DECADE -> occurredAt.getYear() + "s";
            case YEAR -> d.substring(0, 4);
            case SEASON -> switch (occurredAt.getMonthValue()) {   // the stored date is the season's first month
                case 3, 4, 5 -> "Xuân "; case 6, 7, 8 -> "Hè "; case 9, 10, 11 -> "Thu "; default -> "Đông ";
            } + occurredAt.getYear();
            case MONTH -> d.substring(0, 7);
            default -> d;
        };
        return Boolean.TRUE.equals(occurredApprox) ? "~" + t : t;
    }
}
