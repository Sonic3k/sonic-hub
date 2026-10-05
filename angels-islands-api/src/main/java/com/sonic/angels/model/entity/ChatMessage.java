package com.sonic.angels.model.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.UUID;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages", indexes = {
    @Index(name = "idx_chatmsg_archive_ts", columnList = "chat_archive_id, timestamp")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_chatmsg_archive_ext", columnNames = {"chat_archive_id", "external_id"})
})
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnore
    @JoinColumn(name = "chat_archive_id", nullable = false)
    private ChatArchive chatArchive;

    @Column(name = "sender", nullable = false)
    private String sender; // raw username from chat

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false)
    private SenderType senderType = SenderType.PERSON;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    /** UTC. */
    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    /** Original order in the imported file — the ground truth for conversation sequence. */
    @Column(name = "seq")
    private Integer seq;

    /** Importer's stable id, unique within the archive; makes re-imports idempotent. Null for manual uploads. */
    @Column(name = "external_id", length = 64)
    private String externalId;

    /** Null on rows from the original Yahoo upload (all plain text). */
    @Enumerated(EnumType.STRING)
    @Column(name = "kind", length = 16)
    private Kind kind;

    /** How exact the timestamp is: Facebook 2016 dump only has one time per message group, wall posts only a day. */
    @Enumerated(EnumType.STRING)
    @Column(name = "time_precision", length = 16)
    private TimePrecision timePrecision;

    /** Comma-separated source labels this message was found in (e.g. "fb-dyi-2023,fb-2016-dump"). */
    @Column(name = "sources", length = 300)
    private String sources;

    /** Facebook reactions, e.g. "😍Vu Ngoc Anh". */
    @Column(name = "reactions", length = 1000)
    private String reactions;

    /** Wall comment → externalId of the post it belongs to. */
    @Column(name = "reply_to_external_id", length = 64)
    private String replyToExternalId;

    public enum SenderType { SELF, PERSON, OTHER, SYSTEM }
    public enum Kind { TEXT, EMPTY, PHOTO, VIDEO, AUDIO, FILE, GIF, STICKER, POST, COMMENT, OTHER }
    public enum TimePrecision { SECOND, MINUTE, GROUP, DAY }

    public ChatMessage() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public ChatArchive getChatArchive() { return chatArchive; }
    public void setChatArchive(ChatArchive chatArchive) { this.chatArchive = chatArchive; }
    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }
    public SenderType getSenderType() { return senderType; }
    public void setSenderType(SenderType senderType) { this.senderType = senderType; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public Integer getSeq() { return seq; }
    public void setSeq(Integer seq) { this.seq = seq; }
    public String getExternalId() { return externalId; }
    public void setExternalId(String externalId) { this.externalId = externalId; }
    public Kind getKind() { return kind; }
    public void setKind(Kind kind) { this.kind = kind; }
    public TimePrecision getTimePrecision() { return timePrecision; }
    public void setTimePrecision(TimePrecision timePrecision) { this.timePrecision = timePrecision; }
    public String getSources() { return sources; }
    public void setSources(String sources) { this.sources = sources; }
    public String getReactions() { return reactions; }
    public void setReactions(String reactions) { this.reactions = reactions; }
    public String getReplyToExternalId() { return replyToExternalId; }
    public void setReplyToExternalId(String replyToExternalId) { this.replyToExternalId = replyToExternalId; }
}
