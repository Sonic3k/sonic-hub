package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** One thread of a forum, with the posts that were saved of it (a thread saved several times is one thread). */
@Entity
@Table(name = "forum_threads",
    uniqueConstraints = @UniqueConstraint(name = "uk_forum_thread_key", columnNames = {"forum_id", "external_key"}),
    indexes = {@Index(name = "idx_forum_thread_forum", columnList = "forum_id"), @Index(name = "idx_forum_thread_started", columnList = "started_at")})
public class ForumThread extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "forum_id", nullable = false)
    private Forum forum;

    /** The forum's own id for the thread ("onthi:368885"): how a later import finds it again. */
    @Column(name = "external_key", nullable = false, length = 200)
    private String externalKey;

    @Column(name = "title", nullable = false, length = 500)
    private String title;

    /** Where it was on the forum: "Kỷ niệm - Ước mơ / Tâm sự - lưu bút". */
    @Column(name = "board", length = 300)
    private String board;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "last_post_at")
    private LocalDateTime lastPostAt;

    @Column(name = "post_count", nullable = false)
    private int postCount;

    @Column(name = "starter_nick", length = 120)
    private String starterNick;

    /** The saved pages it came from, and when the Web Archive captured them. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "sources", columnDefinition = "jsonb")
    private List<String> sources = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "captured", columnDefinition = "jsonb")
    private List<String> captured = new ArrayList<>();

    /** Hash of what the import sent, so a re-run with the same thread changes nothing. */
    @Column(name = "content_hash", length = 64)
    private String contentHash;

    public UUID getId() { return id; }
    public Forum getForum() { return forum; }
    public void setForum(Forum forum) { this.forum = forum; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String externalKey) { this.externalKey = externalKey; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBoard() { return board; }
    public void setBoard(String board) { this.board = board; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
    public LocalDateTime getLastPostAt() { return lastPostAt; }
    public void setLastPostAt(LocalDateTime lastPostAt) { this.lastPostAt = lastPostAt; }
    public int getPostCount() { return postCount; }
    public void setPostCount(int postCount) { this.postCount = postCount; }
    public String getStarterNick() { return starterNick; }
    public void setStarterNick(String starterNick) { this.starterNick = starterNick; }
    public List<String> getSources() { return sources; }
    public void setSources(List<String> sources) { this.sources = sources == null ? new ArrayList<>() : sources; }
    public List<String> getCaptured() { return captured; }
    public void setCaptured(List<String> captured) { this.captured = captured == null ? new ArrayList<>() : captured; }
    public String getContentHash() { return contentHash; }
    public void setContentHash(String contentHash) { this.contentHash = contentHash; }
}
