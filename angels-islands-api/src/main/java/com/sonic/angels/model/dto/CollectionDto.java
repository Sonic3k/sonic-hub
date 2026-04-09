package com.sonic.angels.model.dto;
import java.util.UUID;

import java.time.LocalDateTime;
import java.util.Set;

public class CollectionDto {

    public static class Request {
        private String name;
        private String description;
        private UUID parentId;
        private Set<UUID> personIds;
        private Set<UUID> tagIds;

        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getDescription() { return description; } public void setDescription(String v) { this.description = v; }
        public UUID getParentId() { return parentId; } public void setParentId(UUID v) { this.parentId = v; }
        public Set<UUID> getPersonIds() { return personIds; } public void setPersonIds(Set<UUID> v) { this.personIds = v; }
        public Set<UUID> getTagIds() { return tagIds; } public void setTagIds(Set<UUID> v) { this.tagIds = v; }
    }

    public static class Response {
        private UUID id;
        private String name;
        private String description;
        private UUID parentId;
        private String parentName;
        private Integer childrenCount;
        private Integer mediaCount;
        private String thumbnailUrl;
        private Set<TagDto.Response> tags;
        private Set<PersonDto.Summary> persons;
        private LocalDateTime createdAt;

        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getDescription() { return description; } public void setDescription(String v) { this.description = v; }
        public UUID getParentId() { return parentId; } public void setParentId(UUID v) { this.parentId = v; }
        public String getParentName() { return parentName; } public void setParentName(String v) { this.parentName = v; }
        public Integer getChildrenCount() { return childrenCount; } public void setChildrenCount(Integer v) { this.childrenCount = v; }
        public Integer getMediaCount() { return mediaCount; } public void setMediaCount(Integer v) { this.mediaCount = v; }
        public String getThumbnailUrl() { return thumbnailUrl; } public void setThumbnailUrl(String v) { this.thumbnailUrl = v; }
        public Set<TagDto.Response> getTags() { return tags; } public void setTags(Set<TagDto.Response> v) { this.tags = v; }
        public Set<PersonDto.Summary> getPersons() { return persons; } public void setPersons(Set<PersonDto.Summary> v) { this.persons = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    }
}

    // ── Tree creation (batch) ────────────────────────────────────────────────
    // POST /api/collections/create-tree
    // Creates root + nested sub-collections from folder paths in one call

    public static class TreeRequest {
        private String rootName;
        private java.util.Set<UUID> personIds;
        private java.util.List<String> folders; // ["2010", "2011", "2011/summer"]

        public String getRootName() { return rootName; } public void setRootName(String v) { this.rootName = v; }
        public java.util.Set<UUID> getPersonIds() { return personIds; } public void setPersonIds(java.util.Set<UUID> v) { this.personIds = v; }
        public java.util.List<String> getFolders() { return folders; } public void setFolders(java.util.List<String> v) { this.folders = v; }
    }

    public static class TreeResponse {
        private UUID rootId;
        private java.util.Map<String, UUID> pathToId; // "2011/summer" → uuid

        public UUID getRootId() { return rootId; } public void setRootId(UUID v) { this.rootId = v; }
        public java.util.Map<String, UUID> getPathToId() { return pathToId; } public void setPathToId(java.util.Map<String, UUID> v) { this.pathToId = v; }
    }
