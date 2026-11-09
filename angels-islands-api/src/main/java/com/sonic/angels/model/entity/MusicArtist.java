package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/**
 * A singer, a band or a duo whose songs are in his lists (Westlife, Take That, Hà Anh Tuấn…). A member who went solo
 * points at the group he came from (Shane Filan → Westlife, Robbie Williams → Take That), so a group's "family" can be
 * read together. favorite = how close it is to him, 1 to 5; country = where it is from (ISO code: IE, GB, US, VN…).
 */
@Entity
@Table(name = "music_artists",
    uniqueConstraints = @UniqueConstraint(name = "uk_music_artist_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_music_artist_parent", columnList = "parent_id"))
public class MusicArtist extends BaseEntity {

    public enum Kind { SOLO, GROUP, DUO, PROJECT, VARIOUS }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Stable name in the address: "westlife", "ha-anh-tuan". */
    @Column(name = "external_key", nullable = false, length = 120)
    private String externalKey;

    @Column(name = "name", nullable = false, length = 300)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", length = 10)
    private Kind kind;

    /** ISO 3166 code of where the artist is from (IE, GB, US, DK, VN…). */
    @Column(name = "country", length = 8)
    private String country;

    /** The group a solo artist came from. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private MusicArtist parent;

    /** 1 to 5; none = not rated. */
    @Column(name = "favorite")
    private Integer favorite;

    /** What the artist is. */
    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    /** His own words about it. */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    /** A picture of the artist (a media file id); none for now. */
    @Column(name = "image_media_id")
    private UUID imageMediaId;

    /** Who wrote it in: null = by hand, else the importer's name. */
    @Column(name = "source", length = 40)
    private String source;

    public MusicArtist() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public Kind getKind() { return kind; }
    public void setKind(Kind v) { this.kind = v; }
    public String getCountry() { return country; }
    public void setCountry(String v) { this.country = v; }
    public MusicArtist getParent() { return parent; }
    public void setParent(MusicArtist v) { this.parent = v; }
    public Integer getFavorite() { return favorite; }
    public void setFavorite(Integer v) { this.favorite = v; }
    public String getSummary() { return summary; }
    public void setSummary(String v) { this.summary = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public UUID getImageMediaId() { return imageMediaId; }
    public void setImageMediaId(UUID v) { this.imageMediaId = v; }
    public String getSource() { return source; }
    public void setSource(String v) { this.source = v; }
}
