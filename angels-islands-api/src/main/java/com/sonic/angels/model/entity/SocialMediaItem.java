package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/**
 * A photo or video of the Social Media portal, under the key the data API knows it by. The file itself is an
 * ordinary MediaFile with mediaCategory SOCIAL, filed under Social Media → platform → profile, so it never shows
 * among the photos of the home page, the albums or the memories.
 */
@Entity
@Table(name = "social_media",
    uniqueConstraints = @UniqueConstraint(name = "uk_social_media_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_social_media_file", columnList = "media_file_id"))
public class SocialMediaItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 300)
    private String externalKey;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "media_file_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MediaFile mediaFile;

    /** Whose album the file went into. */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_profile_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private SocialProfile owner;

    /** The library photo this one was copied from, when it was (a plain id: the original can go its own way). */
    @Column(name = "origin_media_id")
    private UUID originMediaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public SocialMediaItem() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public MediaFile getMediaFile() { return mediaFile; }
    public void setMediaFile(MediaFile v) { this.mediaFile = v; }
    public SocialProfile getOwner() { return owner; }
    public void setOwner(SocialProfile v) { this.owner = v; }
    public UUID getOriginMediaId() { return originMediaId; }
    public void setOriginMediaId(UUID v) { this.originMediaId = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
}
