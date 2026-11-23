package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * A dream (giấc mơ): one record per dream, two dreams of one day being two records of the same day.
 *
 * Kept apart from memories (Episode: what really happened) and from writings (JournalNote): what happens in a dream
 * did not happen. So its two texts are never mixed — content is the dream as he told it (not real), associations is
 * what it calls up in his waking life, in his own words (real: what he saw lately, what he went through then).
 * persons are the people who appear in it; lifeEvents are real events of his life it calls up — a reference only,
 * the dream does not belong to them and never shows on their timeline.
 */
@Entity
@Table(name = "dreams", indexes = {
    @Index(name = "idx_dream_person_day", columnList = "person_id, dreamt_on")
})
public class Dream extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** the dreamer: the owner of the hub unless a request names someone else */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    /** the day he dreamt it — the morning he woke up with it, or the day of a nap: a day of the calendar, no hour */
    @Column(name = "dreamt_on", nullable = false)
    private LocalDate dreamtOn;

    /** its place among the dreams of that day, in the order he told them */
    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "title", length = 300)
    private String title;

    /** the dream as he told it (only the typing put right): none of it happened */
    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    /** what it calls up in his waking life, in his words: this part is real */
    @Column(name = "associations", columnDefinition = "TEXT")
    private String associations;

    /** who appears in it (the dreamer is in every dream and never listed) */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "dream_persons",
        joinColumns = @JoinColumn(name = "dream_id"),
        inverseJoinColumns = @JoinColumn(name = "person_id"))
    @BatchSize(size = 200)
    private Set<Person> persons = new HashSet<>();

    /** the real events it calls up */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "dream_life_events",
        joinColumns = @JoinColumn(name = "dream_id"),
        inverseJoinColumns = @JoinColumn(name = "life_event_id"))
    @BatchSize(size = 200)
    private Set<LifeEvent> lifeEvents = new HashSet<>();

    public Dream() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public LocalDate getDreamtOn() { return dreamtOn; }
    public void setDreamtOn(LocalDate dreamtOn) { this.dreamtOn = dreamtOn; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getAssociations() { return associations; }
    public void setAssociations(String associations) { this.associations = associations; }
    public Set<Person> getPersons() { return persons; }
    public void setPersons(Set<Person> persons) { this.persons = persons; }
    public Set<LifeEvent> getLifeEvents() { return lifeEvents; }
    public void setLifeEvents(Set<LifeEvent> lifeEvents) { this.lifeEvents = lifeEvents; }
}
