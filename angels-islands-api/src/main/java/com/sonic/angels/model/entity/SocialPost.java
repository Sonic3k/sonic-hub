package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Anything that stands on a timeline: a status, photos, a link, a share, a check-in, a life event, a note or a longer
 * article, and the "updated his profile picture / cover photo" posts made with a picture window.
 *
 * author wrote it; wall is where it stands — the author's own timeline, a friend's (written on her wall), a group
 * or a page. A note or article keeps its title and HTML body here, or points at a journal note when the real text
 * already lives in Nhật ký.
 *
 * likeCount / commentCount / shareCount are what the post showed; the reactions and comments kept may be fewer.
 * originArchiveId + originSeq point at the chat message it was first imported as (the 2017 wall pages).
 */
@Entity
@Table(name = "social_posts",
    uniqueConstraints = @UniqueConstraint(name = "uk_social_post_key", columnNames = "external_key"),
    indexes = {
        @Index(name = "idx_social_post_wall", columnList = "wall_profile_id, posted_at"),
        @Index(name = "idx_social_post_author", columnList = "author_profile_id, posted_at"),
        @Index(name = "idx_social_post_time", columnList = "posted_at")
    })
public class SocialPost extends BaseEntity {

    public enum Kind {
        STATUS, PHOTO, LINK, SHARE, CHECK_IN, LIFE_EVENT, NOTE, ARTICLE, AVATAR_CHANGE, COVER_CHANGE
    }
    public enum Audience { PUBLIC, FRIENDS, FRIENDS_OF_FRIENDS, ONLY_ME, CUSTOM }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 300)
    private String externalKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 16)
    private Kind kind = Kind.STATUS;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_profile_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialProfile author;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wall_profile_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialProfile wall;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "album_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private SocialAlbum album;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shared_post_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private SocialPost sharedPost;

    /** A note whose real text lives in Nhật ký. */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journal_note_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private JournalNote journalNote;

    /** A note's or article's title; a life event's ("Started School at FPT University"). */
    @Column(name = "title", length = 500)
    private String title;

    /** What the post says, as written. */
    @Column(name = "text", columnDefinition = "TEXT")
    private String text;

    /** A note's or article's body, HTML. */
    @Column(name = "body", columnDefinition = "TEXT")
    private String body;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cover_media_file_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private MediaFile cover;

    /** UTC. */
    @Column(name = "posted_at", nullable = false)
    private LocalDateTime postedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "posted_precision", length = 16)
    private DatePrecision postedPrecision;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "audience", length = 20)
    private Audience audience;

    /** What follows the name: "feeling excited", "watching Harry Potter". */
    @Column(name = "activity", length = 300)
    private String activity;

    @Column(name = "activity_icon", length = 16)
    private String activityIcon;

    @Column(name = "place_name", length = 300)
    private String placeName;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_profile_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private SocialProfile place;

    /** A life event's own date (the day school started), which may lie before the post. */
    @Column(name = "event_date")
    private LocalDateTime eventDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_precision", length = 16)
    private DatePrecision eventPrecision;

    @Column(name = "link_url", length = 2000)
    private String linkUrl;

    @Column(name = "link_title", length = 500)
    private String linkTitle;

    @Column(name = "link_description", columnDefinition = "TEXT")
    private String linkDescription;

    @Column(name = "link_image_url", length = 2000)
    private String linkImageUrl;

    @Column(name = "like_count")
    private Integer likeCount;

    @Column(name = "comment_count")
    private Integer commentCount;

    @Column(name = "share_count")
    private Integer shareCount;

    @Column(name = "pinned")
    private Boolean pinned = false;

    @Column(name = "origin_archive_id")
    private UUID originArchiveId;

    @Column(name = "origin_seq")
    private Integer originSeq;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @JsonIgnore
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<SocialPostMedia> media = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SocialPostTag> tags = new ArrayList<>();

    public SocialPost() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public Kind getKind() { return kind; }
    public void setKind(Kind v) { this.kind = v; }
    public SocialProfile getAuthor() { return author; }
    public void setAuthor(SocialProfile v) { this.author = v; }
    public SocialProfile getWall() { return wall; }
    public void setWall(SocialProfile v) { this.wall = v; }
    public SocialAlbum getAlbum() { return album; }
    public void setAlbum(SocialAlbum v) { this.album = v; }
    public SocialPost getSharedPost() { return sharedPost; }
    public void setSharedPost(SocialPost v) { this.sharedPost = v; }
    public JournalNote getJournalNote() { return journalNote; }
    public void setJournalNote(JournalNote v) { this.journalNote = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getText() { return text; }
    public void setText(String v) { this.text = v; }
    public String getBody() { return body; }
    public void setBody(String v) { this.body = v; }
    public MediaFile getCover() { return cover; }
    public void setCover(MediaFile v) { this.cover = v; }
    public LocalDateTime getPostedAt() { return postedAt; }
    public void setPostedAt(LocalDateTime v) { this.postedAt = v; }
    public DatePrecision getPostedPrecision() { return postedPrecision; }
    public void setPostedPrecision(DatePrecision v) { this.postedPrecision = v; }
    public LocalDateTime getEditedAt() { return editedAt; }
    public void setEditedAt(LocalDateTime v) { this.editedAt = v; }
    public Audience getAudience() { return audience; }
    public void setAudience(Audience v) { this.audience = v; }
    public String getActivity() { return activity; }
    public void setActivity(String v) { this.activity = v; }
    public String getActivityIcon() { return activityIcon; }
    public void setActivityIcon(String v) { this.activityIcon = v; }
    public String getPlaceName() { return placeName; }
    public void setPlaceName(String v) { this.placeName = v; }
    public SocialProfile getPlace() { return place; }
    public void setPlace(SocialProfile v) { this.place = v; }
    public LocalDateTime getEventDate() { return eventDate; }
    public void setEventDate(LocalDateTime v) { this.eventDate = v; }
    public DatePrecision getEventPrecision() { return eventPrecision; }
    public void setEventPrecision(DatePrecision v) { this.eventPrecision = v; }
    public String getLinkUrl() { return linkUrl; }
    public void setLinkUrl(String v) { this.linkUrl = v; }
    public String getLinkTitle() { return linkTitle; }
    public void setLinkTitle(String v) { this.linkTitle = v; }
    public String getLinkDescription() { return linkDescription; }
    public void setLinkDescription(String v) { this.linkDescription = v; }
    public String getLinkImageUrl() { return linkImageUrl; }
    public void setLinkImageUrl(String v) { this.linkImageUrl = v; }
    public Integer getLikeCount() { return likeCount; }
    public void setLikeCount(Integer v) { this.likeCount = v; }
    public Integer getCommentCount() { return commentCount; }
    public void setCommentCount(Integer v) { this.commentCount = v; }
    public Integer getShareCount() { return shareCount; }
    public void setShareCount(Integer v) { this.shareCount = v; }
    public Boolean getPinned() { return pinned; }
    public void setPinned(Boolean v) { this.pinned = v; }
    public UUID getOriginArchiveId() { return originArchiveId; }
    public void setOriginArchiveId(UUID v) { this.originArchiveId = v; }
    public Integer getOriginSeq() { return originSeq; }
    public void setOriginSeq(Integer v) { this.originSeq = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public List<SocialPostMedia> getMedia() { return media; }
    public List<SocialPostTag> getTags() { return tags; }
}
