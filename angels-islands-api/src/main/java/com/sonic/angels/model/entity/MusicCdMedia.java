package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/** A photo or scan of one of his CDs (the file is one of his pictures, in his albums). The file going removes the link. */
@Entity
@Table(name = "music_cd_media",
    uniqueConstraints = @UniqueConstraint(name = "uk_music_cd_media", columnNames = {"cd_id", "media_file_id"}),
    indexes = @Index(name = "idx_music_cd_media_media", columnList = "media_file_id"))
public class MusicCdMedia extends BaseEntity {

    public enum Role { PHOTO, SCAN }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cd_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MusicCd cd;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "media_file_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MediaFile media;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 8)
    private Role role = Role.PHOTO;

    /** What it shows: "front", "back", "booklet p.3", "disc". */
    @Column(name = "label", length = 300)
    private String label;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public MusicCdMedia() {}

    public UUID getId() { return id; }
    public MusicCd getCd() { return cd; }
    public void setCd(MusicCd v) { this.cd = v; }
    public MediaFile getMedia() { return media; }
    public void setMedia(MediaFile v) { this.media = v; }
    public Role getRole() { return role == null ? Role.PHOTO : role; }
    public void setRole(Role v) { this.role = v; }
    public String getLabel() { return label; }
    public void setLabel(String v) { this.label = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
}
