package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/** Where a recording lives online: its video on YouTube, Spotify, the lyrics… A song may have only links, no file. */
@Entity
@Table(name = "music_links", indexes = @Index(name = "idx_music_link_track", columnList = "track_id"))
public class MusicLink extends BaseEntity {

    public enum Kind { YOUTUBE, SPOTIFY, APPLE_MUSIC, SOUNDCLOUD, LYRICS, WIKI, OFFICIAL, OTHER }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "track_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MusicTrack track;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 12)
    private Kind kind = Kind.OTHER;

    @Column(name = "title", length = 300)
    private String title;

    @Column(name = "url", nullable = false, length = 1000)
    private String url;

    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public MusicLink() {}

    public UUID getId() { return id; }
    public MusicTrack getTrack() { return track; }
    public void setTrack(MusicTrack v) { this.track = v; }
    public Kind getKind() { return kind == null ? Kind.OTHER : kind; }
    public void setKind(Kind v) { this.kind = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getUrl() { return url; }
    public void setUrl(String v) { this.url = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
}
