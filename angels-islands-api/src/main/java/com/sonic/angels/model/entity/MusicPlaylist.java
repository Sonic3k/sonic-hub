package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A list of his songs kept at a moment — a checkpoint. WINDOW: the songs new to him or most played since the checkpoint
 * before ("My list 2008" = 2005 → 2008; windowFrom → takenAt). FULL: every song in his list at that moment ("My all
 * list 2015.07.31 - last day of JVJ"). CURATED: a list made for something (a story, a mood). The machine it lived on and
 * the event it marks are said when known.
 */
@Entity
@Table(name = "music_playlists",
    uniqueConstraints = @UniqueConstraint(name = "uk_music_playlist_key", columnNames = "external_key"))
public class MusicPlaylist extends BaseEntity {

    public enum Kind { WINDOW, FULL, CURATED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** "my-list-2008", "my-all-list-2015-07-31". */
    @Column(name = "external_key", nullable = false, length = 160)
    private String externalKey;

    /** As he named it: "My all list 2015.07.31 - last day of JVJ". */
    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 8)
    private Kind kind = Kind.FULL;

    /** The checkpoint: when the list was as it is (start of the span it is known to). */
    @Column(name = "taken_at")
    private LocalDateTime takenAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "taken_precision", length = 10)
    private DatePrecision takenPrecision;

    @Column(name = "taken_approx")
    private Boolean takenApprox;

    /** WINDOW: where its window starts (the checkpoint before); it ends at takenAt's span. */
    @Column(name = "window_from")
    private LocalDateTime windowFrom;

    /** The computer or music player it lived on. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private DeskDevice device;

    /** The event it marks ("last day of JVJ"). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private LifeEvent event;

    /** Where it is on his disk: "D:\Music\My list\My list 2008". */
    @Column(name = "source_folder", length = 500)
    private String sourceFolder;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "source", length = 40)
    private String source;

    public MusicPlaylist() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public Kind getKind() { return kind == null ? Kind.FULL : kind; }
    public void setKind(Kind v) { this.kind = v; }
    public LocalDateTime getTakenAt() { return takenAt; }
    public void setTakenAt(LocalDateTime v) { this.takenAt = v; }
    public DatePrecision getTakenPrecision() { return takenPrecision; }
    public void setTakenPrecision(DatePrecision v) { this.takenPrecision = v; }
    public Boolean getTakenApprox() { return takenApprox; }
    public void setTakenApprox(Boolean v) { this.takenApprox = v; }
    public LocalDateTime getWindowFrom() { return windowFrom; }
    public void setWindowFrom(LocalDateTime v) { this.windowFrom = v; }
    public DeskDevice getDevice() { return device; }
    public void setDevice(DeskDevice v) { this.device = v; }
    public LifeEvent getEvent() { return event; }
    public void setEvent(LifeEvent v) { this.event = v; }
    public String getSourceFolder() { return sourceFolder; }
    public void setSourceFolder(String v) { this.sourceFolder = v; }
    public String getSummary() { return summary; }
    public void setSummary(String v) { this.summary = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
    public String getSource() { return source; }
    public void setSource(String v) { this.source = v; }

    /** First moment after the checkpoint's own span (exclusive). */
    public LocalDateTime takenEnd() {
        if (takenAt == null) return null;
        return (takenPrecision != null ? takenPrecision : DatePrecision.DAY).end(takenAt);
    }
}
