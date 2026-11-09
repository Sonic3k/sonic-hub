package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/**
 * An album, single or compilation a song of his comes from (Westlife's "Coast to Coast", a "NOW 8"). The CDs of it he
 * owns are {@link MusicCd}s; their scans and photos hang off those, never off the cover — the cover is a picture found
 * for the album later (empty for now).
 */
@Entity
@Table(name = "music_albums",
    uniqueConstraints = @UniqueConstraint(name = "uk_music_album_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_music_album_artist", columnList = "artist_id"))
public class MusicAlbum extends BaseEntity {

    public enum Kind { ALBUM, SINGLE, EP, COMPILATION, LIVE, SOUNDTRACK }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** "westlife-coast-to-coast". */
    @Column(name = "external_key", nullable = false, length = 160)
    private String externalKey;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    /** The album's artist; none = various artists. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artist_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private MusicArtist artist;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", length = 12)
    private Kind kind;

    @Column(name = "release_year")
    private Integer releaseYear;

    /** 1 to 5; none = not rated. */
    @Column(name = "favorite")
    private Integer favorite;

    /** The album's cover (a media file id), found later; never one of his CD scans. */
    @Column(name = "cover_media_id")
    private UUID coverMediaId;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "source", length = 40)
    private String source;

    public MusicAlbum() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public MusicArtist getArtist() { return artist; }
    public void setArtist(MusicArtist v) { this.artist = v; }
    public Kind getKind() { return kind; }
    public void setKind(Kind v) { this.kind = v; }
    public Integer getReleaseYear() { return releaseYear; }
    public void setReleaseYear(Integer v) { this.releaseYear = v; }
    public Integer getFavorite() { return favorite; }
    public void setFavorite(Integer v) { this.favorite = v; }
    public UUID getCoverMediaId() { return coverMediaId; }
    public void setCoverMediaId(UUID v) { this.coverMediaId = v; }
    public String getSummary() { return summary; }
    public void setSummary(String v) { this.summary = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public String getSource() { return source; }
    public void setSource(String v) { this.source = v; }
}
