package com.sonic.angels.model.dto;

import com.sonic.angels.model.entity.ChatArchive;
import java.util.UUID;
import java.time.LocalDateTime;

public class ChatArchiveDto {
    public static class Response {
        private UUID id; private ChatArchive.Platform platform; private String title;
        private Integer messageCount; private LocalDateTime dateFrom; private LocalDateTime dateTo;
        private ChatArchive.ExtractionStatus extractionStatus; private LocalDateTime createdAt;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public ChatArchive.Platform getPlatform() { return platform; } public void setPlatform(ChatArchive.Platform v) { this.platform = v; }
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public Integer getMessageCount() { return messageCount; } public void setMessageCount(Integer v) { this.messageCount = v; }
        public LocalDateTime getDateFrom() { return dateFrom; } public void setDateFrom(LocalDateTime v) { this.dateFrom = v; }
        public LocalDateTime getDateTo() { return dateTo; } public void setDateTo(LocalDateTime v) { this.dateTo = v; }
        public ChatArchive.ExtractionStatus getExtractionStatus() { return extractionStatus; } public void setExtractionStatus(ChatArchive.ExtractionStatus v) { this.extractionStatus = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    }

    public static class ImportResult {
        private UUID archiveId; private int totalConversations; private int totalMessages;
        private LocalDateTime dateFrom; private LocalDateTime dateTo;
        public UUID getArchiveId() { return archiveId; } public void setArchiveId(UUID v) { this.archiveId = v; }
        public int getTotalConversations() { return totalConversations; } public void setTotalConversations(int v) { this.totalConversations = v; }
        public int getTotalMessages() { return totalMessages; } public void setTotalMessages(int v) { this.totalMessages = v; }
        public LocalDateTime getDateFrom() { return dateFrom; } public void setDateFrom(LocalDateTime v) { this.dateFrom = v; }
        public LocalDateTime getDateTo() { return dateTo; } public void setDateTo(LocalDateTime v) { this.dateTo = v; }
    }
}
