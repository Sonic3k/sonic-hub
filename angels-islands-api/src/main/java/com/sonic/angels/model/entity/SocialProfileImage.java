package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A profile picture or cover photo for a window of time. At a moment the window that covers it shows (the one that
 * started last); in a gap the default one shows; with no default, the network's blank silhouette or empty cover.
 * A window with a start is announced on the timeline ("updated his profile picture") by its own post, which can carry
 * comments and likes like any other.
 */
@Entity
@Table(name = "social_profile_images",
    uniqueConstraints = @UniqueConstraint(name = "uk_social_image_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_social_image_profile", columnList = "profile_id, kind"))
public class SocialProfileImage extends BaseEntity {

    public enum Kind { AVATAR, COVER }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 300)
    private String externalKey;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialProfile profile;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 8)
    private Kind kind;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "media_file_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MediaFile mediaFile;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_to")
    private LocalDateTime validTo;

    /** Shown whenever no other window covers the moment. */
    @Column(name = "is_default", nullable = false)
    private boolean isDefault;

    /** Where the frame sits on the picture, 0..1 from the left / top (a cover is cut to a wide strip). */
    @Column(name = "focus_x")
    private Float focusX;

    @Column(name = "focus_y")
    private Float focusY;

    /** The timeline post announcing the change, made with the window when it has a start. */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private SocialPost post;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public SocialProfileImage() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public SocialProfile getProfile() { return profile; }
    public void setProfile(SocialProfile v) { this.profile = v; }
    public Kind getKind() { return kind; }
    public void setKind(Kind v) { this.kind = v; }
    public MediaFile getMediaFile() { return mediaFile; }
    public void setMediaFile(MediaFile v) { this.mediaFile = v; }
    public LocalDateTime getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDateTime v) { this.validFrom = v; }
    public LocalDateTime getValidTo() { return validTo; }
    public void setValidTo(LocalDateTime v) { this.validTo = v; }
    public boolean isDefault() { return isDefault; }
    public void setDefault(boolean v) { this.isDefault = v; }
    public Float getFocusX() { return focusX; }
    public void setFocusX(Float v) { this.focusX = v; }
    public Float getFocusY() { return focusY; }
    public void setFocusY(Float v) { this.focusY = v; }
    public SocialPost getPost() { return post; }
    public void setPost(SocialPost v) { this.post = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
}
