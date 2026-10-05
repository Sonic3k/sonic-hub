package com.sonic.angels.model.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.UUID;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "chat_archives", uniqueConstraints = {
    @UniqueConstraint(name = "uk_chat_archive_person_ext", columnNames = {"person_id", "external_key"})
})
public class ChatArchive extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform", nullable = false)
    private Platform platform;

    @Column(name = "title")
    private String title;

    @Column(name = "raw_content", columnDefinition = "TEXT")
    private String rawContent;

    /** Visible messages (EMPTY ones are stored but not counted). */
    @Column(name = "message_count")
    private Integer messageCount;

    @Column(name = "date_from")
    private LocalDateTime dateFrom;

    @Column(name = "date_to")
    private LocalDateTime dateTo;

    /** Importer's thread key (e.g. "fb:bichtran_10205025642513093", "yahoo:globus_chrysanthemum"); null for manual uploads. */
    @Column(name = "external_key", length = 200)
    private String externalKey;

    /** Comma-separated provenance labels of the messages (e.g. "fb-dyi-2023,fb-dyi-2022,fb-2016-dump"). */
    @Column(name = "sources", length = 500)
    private String sources;

    @Enumerated(EnumType.STRING)
    @Column(name = "extraction_status")
    private ExtractionStatus extractionStatus = ExtractionStatus.PENDING;

    @JsonIgnore
    @OneToMany(mappedBy = "chatArchive", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("seq ASC")
    private List<ChatMessage> messages = new ArrayList<>();

    public enum Platform { YAHOO, FACEBOOK, SMS, ZALO, TELEGRAM, BLOG, OTHER }
    public enum ExtractionStatus { PENDING, EXTRACTING, DONE, ERROR }

    public ChatArchive() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public Platform getPlatform() { return platform; }
    public void setPlatform(Platform platform) { this.platform = platform; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getRawContent() { return rawContent; }
    public void setRawContent(String rawContent) { this.rawContent = rawContent; }
    public Integer getMessageCount() { return messageCount; }
    public void setMessageCount(Integer messageCount) { this.messageCount = messageCount; }
    public LocalDateTime getDateFrom() { return dateFrom; }
    public void setDateFrom(LocalDateTime dateFrom) { this.dateFrom = dateFrom; }
    public LocalDateTime getDateTo() { return dateTo; }
    public void setDateTo(LocalDateTime dateTo) { this.dateTo = dateTo; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String externalKey) { this.externalKey = externalKey; }
    public String getSources() { return sources; }
    public void setSources(String sources) { this.sources = sources; }
    public ExtractionStatus getExtractionStatus() { return extractionStatus; }
    public void setExtractionStatus(ExtractionStatus extractionStatus) { this.extractionStatus = extractionStatus; }
    public List<ChatMessage> getMessages() { return messages; }
    public void setMessages(List<ChatMessage> messages) { this.messages = messages; }
}
