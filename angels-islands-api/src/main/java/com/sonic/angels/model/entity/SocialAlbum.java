package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A photo album on a profile ("Hạ Long 2012"). Its photos are those of the posts filed into it. Profile Pictures and
 * Cover Photos are not rows: they are read from the picture windows.
 */
@Entity
@Table(name = "social_albums",
    uniqueConstraints = @UniqueConstraint(name = "uk_social_album_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_social_album_profile", columnList = "profile_id"))
public class SocialAlbum extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 200)
    private String externalKey;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialProfile profile;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "location", length = 300)
    private String location;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cover_media_file_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private MediaFile cover;

    /** When the album was made; it does not exist before. */
    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public SocialAlbum() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public SocialProfile getProfile() { return profile; }
    public void setProfile(SocialProfile v) { this.profile = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
    public String getLocation() { return location; }
    public void setLocation(String v) { this.location = v; }
    public MediaFile getCover() { return cover; }
    public void setCover(MediaFile v) { this.cover = v; }
    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(LocalDateTime v) { this.publishedAt = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
}
