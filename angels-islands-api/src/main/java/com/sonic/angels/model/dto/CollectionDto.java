package com.sonic.angels.model.dto;

import java.time.LocalDateTime;
import java.util.Set;

public class CollectionDto {
    public static class Request {
        private String name; private String description; private Long parentId;
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getDescription() { return description; } public void setDescription(String v) { this.description = v; }
        public Long getParentId() { return parentId; } public void setParentId(Long v) { this.parentId = v; }
    }
    public static class Response {
        private Long id; private String name; private String description; private Long parentId;
        private Integer mediaCount; private Integer personCount; private String thumbnailUrl; private LocalDateTime createdAt;
        public Long getId() { return id; } public void setId(Long v) { this.id = v; }
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getDescription() { return description; } public void setDescription(String v) { this.description = v; }
        public Long getParentId() { return parentId; } public void setParentId(Long v) { this.parentId = v; }
        public Integer getMediaCount() { return mediaCount; } public void setMediaCount(Integer v) { this.mediaCount = v; }
        public Integer getPersonCount() { return personCount; } public void setPersonCount(Integer v) { this.personCount = v; }
        public String getThumbnailUrl() { return thumbnailUrl; } public void setThumbnailUrl(String v) { this.thumbnailUrl = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    }
}
