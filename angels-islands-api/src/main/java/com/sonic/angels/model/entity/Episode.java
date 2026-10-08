package com.sonic.angels.model.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.UUID;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "episodes", indexes = {
    @Index(name = "idx_episode_person", columnList = "person_id"),
    @Index(name = "idx_episode_importance", columnList = "importance"),
    @Index(name = "idx_episode_occurred", columnList = "occurred_at")
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
}
