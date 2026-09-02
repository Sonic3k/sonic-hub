package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/** A journal entry — long essay or one-line vent. Rich HTML content with inline images. */
@Entity
@Table(name = "journal_notes")
public class JournalNote extends BaseEntity {

    @Id
    @GeneratedValue
    private UUID id;

    /** Optional — quick vents don't need one. */
    @Column(name = "title")
    private String title;

    /** Rich HTML (TipTap): bold, paragraphs, inline CDN images. */
    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    /** Free-form mood word ("stress", "nhớ", ...). Deliberately not an enum. */
    @Column(name = "mood")
    private String mood;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "journal_note_problems",
        joinColumns = @JoinColumn(name = "note_id"),
        inverseJoinColumns = @JoinColumn(name = "problem_id"))
    private Set<Problem> problems = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "journal_note_tags",
        joinColumns = @JoinColumn(name = "note_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getMood() { return mood; }
    public void setMood(String mood) { this.mood = mood; }
    public Set<Problem> getProblems() { return problems; }
    public void setProblems(Set<Problem> problems) { this.problems = problems; }
    public Set<Tag> getTags() { return tags; }
    public void setTags(Set<Tag> tags) { this.tags = tags; }
}
