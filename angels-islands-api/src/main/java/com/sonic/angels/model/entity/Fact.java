package com.sonic.angels.model.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "facts", indexes = {
    @Index(name = "idx_fact_person_key_period", columnList = "person_id, key, period", unique = true),
    @Index(name = "idx_fact_category", columnList = "category")
})
public class Fact extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnore
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @Column(name = "category", nullable = false)
    private String category; // basic, preference, habit, work, family, hobby

    @Column(name = "key", nullable = false)
    private String key;

    @Column(name = "value", columnDefinition = "TEXT", nullable = false)
    private String value;

    @Column(name = "period")
    private String period; // NULL=always, "2013", "2010-2012"

    @Column(name = "confidence")
    private Float confidence = 1.0f;

    @Column(name = "source_archive_id")
    private UUID sourceArchiveId;

    public Fact() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public Float getConfidence() { return confidence; }
    public void setConfidence(Float confidence) { this.confidence = confidence; }
    public UUID getSourceArchiveId() { return sourceArchiveId; }
    public void setSourceArchiveId(UUID sourceArchiveId) { this.sourceArchiveId = sourceArchiveId; }
}
