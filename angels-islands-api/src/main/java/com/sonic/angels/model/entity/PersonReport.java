package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.util.UUID;

/**
 * A long write-up about a person, kept whole (Markdown): e.g. the deep research of an Angel — timeline, numbers,
 * scores and what is still unsure. One per source, so a re-run of that source replaces it; the short pieces of the
 * same research live in memory (facts, traits, chapters, episodes) under the same source.
 */
@Entity
@Table(name = "person_reports", uniqueConstraints = @UniqueConstraint(name = "uq_person_report", columnNames = {"person_id", "source"}))
public class PersonReport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    /** who wrote it, e.g. "deep" — the same name the memory of that source carries */
    @Column(name = "source", nullable = false, length = 40)
    private String source;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    public UUID getId() { return id; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
