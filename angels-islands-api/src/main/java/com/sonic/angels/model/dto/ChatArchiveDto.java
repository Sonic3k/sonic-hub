package com.sonic.angels.model.dto;

import com.sonic.angels.model.entity.ChatArchive;
import java.util.UUID;
import java.time.LocalDateTime;

public class ChatArchiveDto {
    public static class Response {
        private UUID id; private ChatArchive.Platform platform; private String title;
        private Integer messageCount; private LocalDateTime dateFrom; private LocalDateTime dateTo;
        private ChatArchive.ExtractionStatus extractionStatus; private LocalDateTime createdAt;
        private String externalKey; private String sources;
        /** Other chats: who it was with and the group key; personId is set once an archive is linked to someone. */
        private String counterpart; private String counterpartKey; private UUID personId; private String personName;
        public String getCounterpart() { return counterpart; } public void setCounterpart(String v) { this.counterpart = v; }
        public String getCounterpartKey() { return counterpartKey; } public void setCounterpartKey(String v) { this.counterpartKey = v; }
        public UUID getPersonId() { return personId; } public void setPersonId(UUID v) { this.personId = v; }
        public String getPersonName() { return personName; } public void setPersonName(String v) { this.personName = v; }
        public String getExternalKey() { return externalKey; } public void setExternalKey(String v) { this.externalKey = v; }
        public String getSources() { return sources; } public void setSources(String v) { this.sources = v; }
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public ChatArchive.Platform getPlatform() { return platform; } public void setPlatform(ChatArchive.Platform v) { this.platform = v; }
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public Integer getMessageCount() { return messageCount; } public void setMessageCount(Integer v) { this.messageCount = v; }
        public LocalDateTime getDateFrom() { return dateFrom; } public void setDateFrom(LocalDateTime v) { this.dateFrom = v; }
        public LocalDateTime getDateTo() { return dateTo; } public void setDateTo(LocalDateTime v) { this.dateTo = v; }
        public ChatArchive.ExtractionStatus getExtractionStatus() { return extractionStatus; } public void setExtractionStatus(ChatArchive.ExtractionStatus v) { this.extractionStatus = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    }

    /** PATCH /api/chat-archives/{id}: link an other-chat to a person (or unlink it) and/or rename its counterpart. */
    public static class ArchivePatch {
        private UUID personId; private Boolean unlink; private String counterpart;
        public UUID getPersonId() { return personId; } public void setPersonId(UUID v) { this.personId = v; }
        public Boolean getUnlink() { return unlink; } public void setUnlink(Boolean v) { this.unlink = v; }
        public String getCounterpart() { return counterpart; } public void setCounterpart(String v) { this.counterpart = v; }
    }

    public static class ImportResult {
        private UUID archiveId; private int totalConversations; private int totalMessages;
        private int skippedLines;
        private LocalDateTime dateFrom; private LocalDateTime dateTo;
        public UUID getArchiveId() { return archiveId; } public void setArchiveId(UUID v) { this.archiveId = v; }
        public int getTotalConversations() { return totalConversations; } public void setTotalConversations(int v) { this.totalConversations = v; }
        public int getTotalMessages() { return totalMessages; } public void setTotalMessages(int v) { this.totalMessages = v; }
        public int getSkippedLines() { return skippedLines; } public void setSkippedLines(int v) { this.skippedLines = v; }
        public LocalDateTime getDateFrom() { return dateFrom; } public void setDateFrom(LocalDateTime v) { this.dateFrom = v; }
        public LocalDateTime getDateTo() { return dateTo; } public void setDateTo(LocalDateTime v) { this.dateTo = v; }
    }
}
