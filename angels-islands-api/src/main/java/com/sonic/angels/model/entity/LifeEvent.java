package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Something that clearly happened in someone's life over a known stretch of time — a trip, a concert, a move,
 * buying a laptop, the first day in the US. Memories are moments that come back at random; an event is the frame
 * they sit in, so any moment can be placed: which event it is in, and which comes next.
 * Albums, memories and money transactions point at the event they belong to (one each); people take part in it.
 * An event can be part of a longer one (a concert inside a trip).
 */
@Entity
@Table(name = "life_events", indexes = {
    @Index(name = "idx_life_event_person", columnList = "person_id"),
    @Index(name = "idx_life_event_start", columnList = "start_at"),
    @Index(name = "idx_life_event_source_key", columnList = "source, external_key")
})
public class LifeEvent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Whose life it is part of. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @Column(name = "title", length = 300, nullable = false)
    private String title;

    /** TRIP, CONCERT, SHOW, MILESTONE, PURCHASE, WORK, STUDY, GATHERING, CELEBRATION, MOVE, SPORT, OTHER (free text). */
    @Column(name = "kind", length = 30)
    private String kind;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    /** Start of the span it is known to (1995-01-01 for "1995"). */
    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "start_precision", length = 10)
    private DatePrecision precision;

    @Column(name = "approx")
    private Boolean approx;

    /** Last day (or moment) of an event that lasted; null = it fits in its start's precision (that day, that month). */
    @Column(name = "end_at")
    private LocalDateTime endAt;

    @Column(name = "place", length = 300)
    private String place;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    /** 1-10, as memories. */
    @Column(name = "importance")
    private Integer importance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private LifeEvent parent;

    /** The picture shown for it (a media file id; when that file is gone, the first album's cover is shown). */
    @Column(name = "cover_media_id")
    private UUID coverMediaId;

    /** Who wrote it in: null = by hand, else the importer's name ("era2018"). */
    @Column(name = "source", length = 40)
    private String source;

    /** The importer's own stable name for it, unique within its source. */
    @Column(name = "external_key", length = 160)
    private String externalKey;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "life_event_persons",
        joinColumns = @JoinColumn(name = "life_event_id"),
        inverseJoinColumns = @JoinColumn(name = "person_id"))
    @BatchSize(size = 200)
    private Set<Person> persons = new HashSet<>();

    public LifeEvent() {}

    /** First moment after the event (exclusive). */
    public LocalDateTime endExclusive() {
        if (endAt != null) return endAt.toLocalTime().equals(LocalTime.MIDNIGHT) ? endAt.plusDays(1) : endAt;
        DatePrecision p = precision != null ? precision : DatePrecision.DAY;
        return p.end(startAt);
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public LocalDateTime getStartAt() { return startAt; }
    public void setStartAt(LocalDateTime startAt) { this.startAt = startAt; }
    public DatePrecision getPrecision() { return precision; }
    public void setPrecision(DatePrecision precision) { this.precision = precision; }
    public Boolean getApprox() { return approx; }
    public void setApprox(Boolean approx) { this.approx = approx; }
    public LocalDateTime getEndAt() { return endAt; }
    public void setEndAt(LocalDateTime endAt) { this.endAt = endAt; }
    public String getPlace() { return place; }
    public void setPlace(String place) { this.place = place; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public Integer getImportance() { return importance; }
    public void setImportance(Integer importance) { this.importance = importance; }
    public LifeEvent getParent() { return parent; }
    public void setParent(LifeEvent parent) { this.parent = parent; }
    public UUID getCoverMediaId() { return coverMediaId; }
    public void setCoverMediaId(UUID coverMediaId) { this.coverMediaId = coverMediaId; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String externalKey) { this.externalKey = externalKey; }
    public Set<Person> getPersons() { return persons; }
    public void setPersons(Set<Person> persons) { this.persons = persons; }
}
