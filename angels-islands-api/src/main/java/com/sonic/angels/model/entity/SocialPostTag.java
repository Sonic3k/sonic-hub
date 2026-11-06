package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/** Someone tagged in a post ("— with Vu Ngoc Anh and 2 others"); the post also shows on their timeline. */
@Entity
@Table(name = "social_post_tags",
    uniqueConstraints = @UniqueConstraint(name = "uk_social_post_tag", columnNames = {"post_id", "profile_id"}),
    indexes = @Index(name = "idx_social_post_tag_profile", columnList = "profile_id"))
public class SocialPostTag {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialPost post;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialProfile profile;

    @Column(name = "position")
    private Integer position;

    public SocialPostTag() {}

    public UUID getId() { return id; }
    public SocialPost getPost() { return post; }
    public void setPost(SocialPost v) { this.post = v; }
    public SocialProfile getProfile() { return profile; }
    public void setProfile(SocialProfile v) { this.profile = v; }
    public Integer getPosition() { return position; }
    public void setPosition(Integer v) { this.position = v; }
}
