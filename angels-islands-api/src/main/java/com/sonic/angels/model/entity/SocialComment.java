package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A comment under a post — or under one photo of it (postMedia) — or a reply to another comment (parent).
 * It shows from postedAt on; before that the post is read without it.
 */
@Entity
@Table(name = "social_comments",
    uniqueConstraints = @UniqueConstraint(name = "uk_social_comment_key", columnNames = "external_key"),
    indexes = {
        @Index(name = "idx_social_comment_post", columnList = "post_id, posted_at"),
        @Index(name = "idx_social_comment_author", columnList = "author_profile_id"),
        @Index(name = "idx_social_comment_parent", columnList = "parent_id")
    })
public class SocialComment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 300)
    private String externalKey;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialPost post;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_media_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialPostMedia postMedia;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialComment parent;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_profile_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialProfile author;

    @Column(name = "text", columnDefinition = "TEXT")
    private String text;

    /** A photo or sticker sent as (part of) the comment. */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "media_file_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private MediaFile mediaFile;

    @Column(name = "posted_at", nullable = false)
    private LocalDateTime postedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "posted_precision", length = 16)
    private DatePrecision postedPrecision;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @Column(name = "like_count")
    private Integer likeCount;

    @Column(name = "origin_archive_id")
    private UUID originArchiveId;

    @Column(name = "origin_seq")
    private Integer originSeq;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public SocialComment() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public SocialPost getPost() { return post; }
    public void setPost(SocialPost v) { this.post = v; }
    public SocialPostMedia getPostMedia() { return postMedia; }
    public void setPostMedia(SocialPostMedia v) { this.postMedia = v; }
    public SocialComment getParent() { return parent; }
    public void setParent(SocialComment v) { this.parent = v; }
    public SocialProfile getAuthor() { return author; }
    public void setAuthor(SocialProfile v) { this.author = v; }
    public String getText() { return text; }
    public void setText(String v) { this.text = v; }
    public MediaFile getMediaFile() { return mediaFile; }
    public void setMediaFile(MediaFile v) { this.mediaFile = v; }
    public LocalDateTime getPostedAt() { return postedAt; }
    public void setPostedAt(LocalDateTime v) { this.postedAt = v; }
    public DatePrecision getPostedPrecision() { return postedPrecision; }
    public void setPostedPrecision(DatePrecision v) { this.postedPrecision = v; }
    public LocalDateTime getEditedAt() { return editedAt; }
    public void setEditedAt(LocalDateTime v) { this.editedAt = v; }
    public Integer getLikeCount() { return likeCount; }
    public void setLikeCount(Integer v) { this.likeCount = v; }
    public UUID getOriginArchiveId() { return originArchiveId; }
    public void setOriginArchiveId(UUID v) { this.originArchiveId = v; }
    public Integer getOriginSeq() { return originSeq; }
    public void setOriginSeq(Integer v) { this.originSeq = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
}
