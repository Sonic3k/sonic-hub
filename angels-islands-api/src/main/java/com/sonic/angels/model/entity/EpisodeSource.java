package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/** Where a memory is told: a post of a forum thread, a message of a chat, a journal note, or a link — with the words
 *  themselves kept as they were written. The thread / archive / note is a link; when it is deleted the words stay. */
@Entity
@Table(name = "episode_sources", indexes = {
    @Index(name = "idx_episode_source_episode", columnList = "episode_id"),
    @Index(name = "idx_episode_source_thread", columnList = "forum_thread_id"),
    @Index(name = "idx_episode_source_archive", columnList = "chat_archive_id"),
    @Index(name = "idx_episode_source_note", columnList = "journal_note_id")
})
public class EpisodeSource extends BaseEntity {

    public enum Kind { FORUM, CHAT, NOTE, LINK }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "episode_id", nullable = false)
    private Episode episode;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", length = 10, nullable = false)
    private Kind kind;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "forum_thread_id")
    private ForumThread thread;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_archive_id")
    private ChatArchive archive;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journal_note_id")
    private JournalNote note;

    /** The post's sort order in its thread, or the message's seq in its archive — both survive a re-import, ids do not. */
    @Column(name = "position")
    private Integer position;

    /** The words quoted, exactly as written (no added marks, no fixed spelling). */
    @Column(name = "excerpt", columnDefinition = "TEXT")
    private String excerpt;

    /** Who wrote them: the nick on the forum, the sender in the chat. */
    @Column(name = "author", length = 200)
    private String author;

    @Column(name = "said_at")
    private LocalDateTime saidAt;

    @Column(name = "url", length = 1000)
    private String url;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public EpisodeSource() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Episode getEpisode() { return episode; }
    public void setEpisode(Episode episode) { this.episode = episode; }
    public Kind getKind() { return kind; }
    public void setKind(Kind kind) { this.kind = kind; }
    public ForumThread getThread() { return thread; }
    public void setThread(ForumThread thread) { this.thread = thread; }
    public ChatArchive getArchive() { return archive; }
    public void setArchive(ChatArchive archive) { this.archive = archive; }
    public JournalNote getNote() { return note; }
    public void setNote(JournalNote note) { this.note = note; }
    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }
    public String getExcerpt() { return excerpt; }
    public void setExcerpt(String excerpt) { this.excerpt = excerpt; }
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    public LocalDateTime getSaidAt() { return saidAt; }
    public void setSaidAt(LocalDateTime saidAt) { this.saidAt = saidAt; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
