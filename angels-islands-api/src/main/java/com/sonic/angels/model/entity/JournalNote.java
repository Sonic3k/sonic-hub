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

    // ── Article face ─────────────────────────────────────────────────────────
    // One table, two lives. A JOURNAL row is private and unpolished; an
    // ARTICLE row is the same HTML wearing a slug, a cover and a category so
    // the web can show it. Existing rows are journals.

    public enum Kind { JOURNAL, ARTICLE }
    public enum Status { DRAFT, PUBLISHED }

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, columnDefinition = "varchar(16) not null default 'JOURNAL'")
    private Kind kind = Kind.JOURNAL;

    /** URL handle; unique among articles, null for journals. */
    @Column(name = "slug", unique = true)
    private String slug;

    /** One-paragraph summary for cards. */
    @Column(name = "excerpt", columnDefinition = "TEXT")
    private String excerpt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cover_media_id")
    private MediaFile coverMedia;

    /** Section label as shown ("Kỷ niệm", "Game", "Bóng đá"). Free-form on purpose. */
    @Column(name = "category")
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", columnDefinition = "varchar(16) default 'DRAFT'")
    private Status status = Status.DRAFT;

    @Column(name = "published_at")
    private java.time.LocalDateTime publishedAt;

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
    public Kind getKind() { return kind == null ? Kind.JOURNAL : kind; }
    public void setKind(Kind kind) { this.kind = kind; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getExcerpt() { return excerpt; }
    public void setExcerpt(String excerpt) { this.excerpt = excerpt; }
    public MediaFile getCoverMedia() { return coverMedia; }
    public void setCoverMedia(MediaFile coverMedia) { this.coverMedia = coverMedia; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Status getStatus() { return status == null ? Status.DRAFT : status; }
    public void setStatus(Status status) { this.status = status; }
    public java.time.LocalDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(java.time.LocalDateTime publishedAt) { this.publishedAt = publishedAt; }
    public Set<Problem> getProblems() { return problems; }
    public void setProblems(Set<Problem> problems) { this.problems = problems; }
    public Set<Tag> getTags() { return tags; }
    public void setTags(Set<Tag> tags) { this.tags = tags; }
}
