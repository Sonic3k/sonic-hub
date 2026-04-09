package com.sonic.angels.model.dto;

import com.sonic.angels.model.entity.ChatArchive;
import java.time.LocalDateTime;

public class ChatArchiveDto {
    public static class Response {
        private Long id; private ChatArchive.Platform platform; private String title;
        private Integer messageCount; private LocalDateTime dateFrom; private LocalDateTime dateTo;
        private ChatArchive.ExtractionStatus extractionStatus; private LocalDateTime createdAt;
        public Long getId() { return id; } public void setId(Long v) { this.id = v; }
        public ChatArchive.Platform getPlatform() { return platform; } public void setPlatform(ChatArchive.Platform v) { this.platform = v; }
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public Integer getMessageCount() { return messageCount; } public void setMessageCount(Integer v) { this.messageCount = v; }
        public LocalDateTime getDateFrom() { return dateFrom; } public void setDateFrom(LocalDateTime v) { this.dateFrom = v; }
        public LocalDateTime getDateTo() { return dateTo; } public void setDateTo(LocalDateTime v) { this.dateTo = v; }
        public ChatArchive.ExtractionStatus getExtractionStatus() { return extractionStatus; } public void setExtractionStatus(ChatArchive.ExtractionStatus v) { this.extractionStatus = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    }
}
