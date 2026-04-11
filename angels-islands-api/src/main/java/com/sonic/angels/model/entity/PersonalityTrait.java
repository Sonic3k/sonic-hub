package com.sonic.angels.model.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "personality_traits", indexes = {
    @Index(name = "idx_trait_person", columnList = "person_id")
})
public class PersonalityTrait extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnore
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @Column(name = "trait", nullable = false)
    private String trait; // e.g. "caring", "shy", "sarcastic"

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "evidence", columnDefinition = "TEXT")
    private String evidence; // quote or context from chat

    @Column(name = "period")
    private String period;

    public PersonalityTrait() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public String getTrait() { return trait; }
    public void setTrait(String trait) { this.trait = trait; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getEvidence() { return evidence; }
    public void setEvidence(String evidence) { this.evidence = evidence; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
}
