package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Someone's like (or love, haha…) on a post, on one photo of a post, or on a comment. Without a time it counts from
 * the moment what it is on appeared.
 */
@Entity
@Table(name = "social_reactions",
    uniqueConstraints = @UniqueConstraint(name = "uk_social_reaction_key", columnNames = "external_key"),
    indexes = {
        @Index(name = "idx_social_reaction_post", columnList = "post_id"),
        @Index(name = "idx_social_reaction_comment", columnList = "comment_id"),
        @Index(name = "idx_social_reaction_profile", columnList = "profile_id")
    })
public class SocialReaction extends BaseEntity {

    public enum Type { LIKE, LOVE, CARE, HAHA, WOW, SAD, ANGRY }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 400)
    private String externalKey;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialPost post;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_media_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialPostMedia postMedia;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialComment comment;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialProfile profile;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 8)
    private Type type = Type.LIKE;

    @Column(name = "reacted_at")
    private LocalDateTime reactedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public SocialReaction() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public SocialPost getPost() { return post; }
    public void setPost(SocialPost v) { this.post = v; }
    public SocialPostMedia getPostMedia() { return postMedia; }
    public void setPostMedia(SocialPostMedia v) { this.postMedia = v; }
    public SocialComment getComment() { return comment; }
    public void setComment(SocialComment v) { this.comment = v; }
    public SocialProfile getProfile() { return profile; }
    public void setProfile(SocialProfile v) { this.profile = v; }
    public Type getType() { return type; }
    public void setType(Type v) { this.type = v; }
    public LocalDateTime getReactedAt() { return reactedAt; }
    public void setReactedAt(LocalDateTime v) { this.reactedAt = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
}
