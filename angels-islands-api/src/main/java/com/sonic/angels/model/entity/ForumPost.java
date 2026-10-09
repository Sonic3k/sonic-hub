package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/** One post of a forum thread. The poster is a nick; when the nick is someone on the portal, the post is theirs too. */
@Entity
@Table(name = "forum_posts", indexes = {
    @Index(name = "idx_forum_post_thread", columnList = "thread_id, sort_order"),
    @Index(name = "idx_forum_post_person", columnList = "person_id, posted_at"),
    @Index(name = "idx_forum_post_nick", columnList = "author_nick_lower")})
public class ForumPost {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "thread_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private ForumThread thread;

    @Column(name = "forum_id", nullable = false)
    private UUID forumId;

    /** The forum's own id for the post, when the saved page had it. */
    @Column(name = "external_id", length = 40)
    private String externalId;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "author_nick", nullable = false, length = 120)
    private String authorNick;

    @Column(name = "author_nick_lower", nullable = false, length = 120)
    private String authorNickLower;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Person person;

    @Column(name = "posted_at")
    private LocalDateTime postedAt;

    @Column(name = "title", length = 500)
    private String title;

    @Column(name = "content_html", columnDefinition = "TEXT")
    private String contentHtml;

    /** The words of the post, for search. */
    @Column(name = "content_text", columnDefinition = "TEXT")
    private String contentText;

    /** Title and words folded (lower case, no diacritics) so "ve" finds "vé". */
    @Column(name = "search_text", columnDefinition = "TEXT")
    private String searchText;

    public UUID getId() { return id; }
    public ForumThread getThread() { return thread; }
    public void setThread(ForumThread thread) { this.thread = thread; }
    public UUID getForumId() { return forumId; }
    public void setForumId(UUID forumId) { this.forumId = forumId; }
    public String getExternalId() { return externalId; }
    public void setExternalId(String externalId) { this.externalId = externalId; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public String getAuthorNick() { return authorNick; }
    public void setAuthorNick(String authorNick) { this.authorNick = authorNick; this.authorNickLower = authorNick == null ? null : authorNick.toLowerCase(); }
    public String getAuthorNickLower() { return authorNickLower; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public LocalDateTime getPostedAt() { return postedAt; }
    public void setPostedAt(LocalDateTime postedAt) { this.postedAt = postedAt; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContentHtml() { return contentHtml; }
    public void setContentHtml(String contentHtml) { this.contentHtml = contentHtml; }
    public String getContentText() { return contentText; }
    public void setContentText(String contentText) { this.contentText = contentText; }
    public String getSearchText() { return searchText; }
    public void setSearchText(String searchText) { this.searchText = searchText; }
}
