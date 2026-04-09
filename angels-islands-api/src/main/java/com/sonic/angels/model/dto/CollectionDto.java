package com.sonic.angels.model.dto;

import java.time.LocalDateTime;
import java.util.Set;

public class CollectionDto {

    public static class Request {
        private String name;
        private String description;
        private Long parentId;
        private Set<Long> personIds;
        private Set<java.util.UUID> tagIds;

        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getDescription() { return description; } public void setDescription(String v) { this.description = v; }
        public Long getParentId() { return parentId; } public void setParentId(Long v) { this.parentId = v; }
        public Set<Long> getPersonIds() { return personIds; } public void setPersonIds(Set<Long> v) { this.personIds = v; }
        public Set<java.util.UUID> getTagIds() { return tagIds; } public void setTagIds(Set<java.util.UUID> v) { this.tagIds = v; }
    }

    public static class Response {
        private Long id;
        private String name;
        private String description;
        private Long parentId;
        private String parentName;
        private Integer childrenCount;
        private Integer mediaCount;
        private String thumbnailUrl;
        private Set<TagDto.Response> tags;
        private Set<PersonDto.Summary> persons;
        private LocalDateTime createdAt;

        public Long getId() { return id; } public void setId(Long v) { this.id = v; }
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getDescription() { return description; } public void setDescription(String v) { this.description = v; }
        public Long getParentId() { return parentId; } public void setParentId(Long v) { this.parentId = v; }
        public String getParentName() { return parentName; } public void setParentName(String v) { this.parentName = v; }
        public Integer getChildrenCount() { return childrenCount; } public void setChildrenCount(Integer v) { this.childrenCount = v; }
        public Integer getMediaCount() { return mediaCount; } public void setMediaCount(Integer v) { this.mediaCount = v; }
        public String getThumbnailUrl() { return thumbnailUrl; } public void setThumbnailUrl(String v) { this.thumbnailUrl = v; }
        public Set<TagDto.Response> getTags() { return tags; } public void setTags(Set<TagDto.Response> v) { this.tags = v; }
        public Set<PersonDto.Summary> getPersons() { return persons; } public void setPersons(Set<PersonDto.Summary> v) { this.persons = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    }
}
