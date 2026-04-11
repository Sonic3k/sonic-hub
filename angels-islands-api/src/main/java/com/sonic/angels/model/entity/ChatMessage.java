package com.sonic.angels.model.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.UUID;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages", indexes = {
    @Index(name = "idx_chatmsg_archive_ts", columnList = "chat_archive_id, timestamp")
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

    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    public enum SenderType { SELF, PERSON }

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
}
