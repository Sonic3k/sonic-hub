package com.sonic.angels.model.dto;

import com.sonic.angels.model.entity.ChatAttachment;
import com.sonic.angels.model.entity.ChatMessage;

import java.time.LocalDateTime;
import java.util.UUID;

public class ChatAttachmentDto {

    /** One attachment as the chat reader shows it; hasFile says whether /api/chat-attachments/{id}/content can serve it. */
    public static class Item {
        private UUID id; private UUID messageId; private ChatAttachment.Type type;
        private String fileName; private String url; private boolean hasFile;
        private String contentType; private Long sizeBytes;
        /** Of the message it came with: when, which side, where in the conversation. */
        private LocalDateTime timestamp; private ChatMessage.SenderType senderType; private Integer seq;

        /** Row of ChatAttachmentRepository.ITEM: a.id, m.id, a.type, a.fileName, a.url, s.id, s.contentType, s.sizeBytes, m.timestamp, m.senderType, m.seq. */
        public static Item of(Object[] r) {
            Item i = new Item();
            i.id = (UUID) r[0]; i.messageId = (UUID) r[1]; i.type = (ChatAttachment.Type) r[2];
            i.fileName = (String) r[3]; i.url = (String) r[4]; i.hasFile = r[5] != null;
            i.contentType = (String) r[6]; i.sizeBytes = r[7] != null ? ((Number) r[7]).longValue() : null;
            i.timestamp = (LocalDateTime) r[8]; i.senderType = (ChatMessage.SenderType) r[9]; i.seq = (Integer) r[10];
            return i;
        }

        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public UUID getMessageId() { return messageId; } public void setMessageId(UUID v) { this.messageId = v; }
        public ChatAttachment.Type getType() { return type; } public void setType(ChatAttachment.Type v) { this.type = v; }
        public String getFileName() { return fileName; } public void setFileName(String v) { this.fileName = v; }
        public String getUrl() { return url; } public void setUrl(String v) { this.url = v; }
        public boolean isHasFile() { return hasFile; } public void setHasFile(boolean v) { this.hasFile = v; }
        public String getContentType() { return contentType; } public void setContentType(String v) { this.contentType = v; }
        public Long getSizeBytes() { return sizeBytes; } public void setSizeBytes(Long v) { this.sizeBytes = v; }
        public LocalDateTime getTimestamp() { return timestamp; } public void setTimestamp(LocalDateTime v) { this.timestamp = v; }
        public ChatMessage.SenderType getSenderType() { return senderType; } public void setSenderType(ChatMessage.SenderType v) { this.senderType = v; }
        public Integer getSeq() { return seq; } public void setSeq(Integer v) { this.seq = v; }
    }
}
