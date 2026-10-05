package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/**
 * A photo / video / audio / file / sticker / link attached to a chat message.
 * Points at the raw export file it came from (sourceLabel + sourcePath); importSource is
 * filled in once that raw file has been uploaded to storage.
 */
@Entity
@Table(name = "chat_attachments", indexes = {
    @Index(name = "idx_chatatt_message", columnList = "message_id"),
    @Index(name = "idx_chatatt_source", columnList = "source_label, source_path")
})
public class ChatAttachment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private ChatMessage message;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 16)
    private Type type;

    /** Raw archive label, e.g. "facebook-dyi-2023-04-16". */
    @Column(name = "source_label", length = 64)
    private String sourceLabel;

    /** Path inside that archive, e.g. "messages/inbox/x_123/photos/1.jpg". */
    @Column(name = "source_path", length = 600)
    private String sourcePath;

    /** External link when there is no file (shared video, URL preview). */
    @Column(name = "url", length = 1000)
    private String url;

    @Column(name = "file_name", length = 300)
    private String fileName;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_source_id")
    private ImportSource importSource;

    public enum Type { PHOTO, VIDEO, AUDIO, FILE, GIF, STICKER, LINK }

    public ChatAttachment() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public ChatMessage getMessage() { return message; }
    public void setMessage(ChatMessage message) { this.message = message; }
    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public String getSourceLabel() { return sourceLabel; }
    public void setSourceLabel(String sourceLabel) { this.sourceLabel = sourceLabel; }
    public String getSourcePath() { return sourcePath; }
    public void setSourcePath(String sourcePath) { this.sourcePath = sourcePath; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public ImportSource getImportSource() { return importSource; }
    public void setImportSource(ImportSource importSource) { this.importSource = importSource; }
}
