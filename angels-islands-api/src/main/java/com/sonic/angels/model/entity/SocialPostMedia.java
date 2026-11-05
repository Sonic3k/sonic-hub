package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/** A photo or video of a post, in the order the post shows them; it can carry its own caption, comments and likes. */
@Entity
@Table(name = "social_post_media", indexes = {
    @Index(name = "idx_social_post_media_post", columnList = "post_id, position"),
    @Index(name = "idx_social_post_media_file", columnList = "media_file_id")
})
public class SocialPostMedia extends BaseEntity {

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
    @JoinColumn(name = "media_file_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MediaFile mediaFile;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "caption", columnDefinition = "TEXT")
    private String caption;

    public SocialPostMedia() {}

    public UUID getId() { return id; }
    public SocialPost getPost() { return post; }
    public void setPost(SocialPost v) { this.post = v; }
    public MediaFile getMediaFile() { return mediaFile; }
    public void setMediaFile(MediaFile v) { this.mediaFile = v; }
    public int getPosition() { return position; }
    public void setPosition(int v) { this.position = v; }
    public String getCaption() { return caption; }
    public void setCaption(String v) { this.caption = v; }
}
