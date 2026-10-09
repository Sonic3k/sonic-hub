package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
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

    // ── Written by someone else ──────────────────────────────────────────────
    // A note Ngoc Anh did not write: an angel's story, a friend's Facebook note.
    // Both author fields null = his own note.

    /** The angel who wrote it (deleting that person keeps the note, authorName still says who). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_person_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Person authorPerson;

    /** Author as shown; the only author field for someone who is not in Persons. */
    @Column(name = "author_name", length = 200)
    private String authorName;

    /** When it was written (createdAt is when it got here). */
    @Column(name = "written_at")
    private java.time.LocalDateTime writtenAt;

    /** Where the text came from ("Mushroom Hill/Huyen Dieu/.../Gio.doc"). */
    @Column(name = "source", length = 500)
    private String source;

    /** Notes read in order as one series ("Hoa khôi onthi 2008"); seriesOrder is the part number. */
    @Column(name = "series", length = 200)
    private String series;

    @Column(name = "series_order")
    private Integer seriesOrder;

    /** Importer's stable id; null for notes written in the admin. */
    @Column(name = "external_key", length = 200, unique = true)
    private String externalKey;

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
    public Person getAuthorPerson() { return authorPerson; }
    public void setAuthorPerson(Person authorPerson) { this.authorPerson = authorPerson; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public java.time.LocalDateTime getWrittenAt() { return writtenAt; }
    public void setWrittenAt(java.time.LocalDateTime writtenAt) { this.writtenAt = writtenAt; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getSeries() { return series; }
    public void setSeries(String series) { this.series = series; }
    public Integer getSeriesOrder() { return seriesOrder; }
    public void setSeriesOrder(Integer seriesOrder) { this.seriesOrder = seriesOrder; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String externalKey) { this.externalKey = externalKey; }
    public Set<Problem> getProblems() { return problems; }
    public void setProblems(Set<Problem> problems) { this.problems = problems; }
    public Set<Tag> getTags() { return tags; }
    public void setTags(Set<Tag> tags) { this.tags = tags; }
}
