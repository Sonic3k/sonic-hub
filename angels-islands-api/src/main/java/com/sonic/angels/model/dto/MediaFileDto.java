package com.sonic.angels.model.dto;

import com.sonic.angels.model.entity.MediaFile;
import java.time.LocalDateTime;
import java.util.Set;

public class MediaFileDto {

    public static class Response {
        private Long id; private String fileName; private MediaFile.FileType fileType;
        private MediaFile.MediaCategory mediaCategory; private MediaFile.Orientation orientation;
        private Long fileSize; private Integer width; private Integer height; private Float aspectRatio;
        private Integer duration; private Boolean isFavorite; private Boolean isFeatured;
        private String mimeType; private String caption; private String cdnUrl; private String thumbnailUrl;
        private LocalDateTime effectiveDate; private LocalDateTime uploadedAt;
        private Set<PersonDto.Summary> persons; private Set<TagDto.Response> tags;

        public Long getId() { return id; } public void setId(Long v) { this.id = v; }
        public String getFileName() { return fileName; } public void setFileName(String v) { this.fileName = v; }
        public MediaFile.FileType getFileType() { return fileType; } public void setFileType(MediaFile.FileType v) { this.fileType = v; }
        public MediaFile.MediaCategory getMediaCategory() { return mediaCategory; } public void setMediaCategory(MediaFile.MediaCategory v) { this.mediaCategory = v; }
        public MediaFile.Orientation getOrientation() { return orientation; } public void setOrientation(MediaFile.Orientation v) { this.orientation = v; }
        public Long getFileSize() { return fileSize; } public void setFileSize(Long v) { this.fileSize = v; }
        public Integer getWidth() { return width; } public void setWidth(Integer v) { this.width = v; }
        public Integer getHeight() { return height; } public void setHeight(Integer v) { this.height = v; }
        public Float getAspectRatio() { return aspectRatio; } public void setAspectRatio(Float v) { this.aspectRatio = v; }
        public Integer getDuration() { return duration; } public void setDuration(Integer v) { this.duration = v; }
        public Boolean getIsFavorite() { return isFavorite; } public void setIsFavorite(Boolean v) { this.isFavorite = v; }
        public Boolean getIsFeatured() { return isFeatured; } public void setIsFeatured(Boolean v) { this.isFeatured = v; }
        public String getMimeType() { return mimeType; } public void setMimeType(String v) { this.mimeType = v; }
        public String getCaption() { return caption; } public void setCaption(String v) { this.caption = v; }
        public String getCdnUrl() { return cdnUrl; } public void setCdnUrl(String v) { this.cdnUrl = v; }
        public String getThumbnailUrl() { return thumbnailUrl; } public void setThumbnailUrl(String v) { this.thumbnailUrl = v; }
        public LocalDateTime getEffectiveDate() { return effectiveDate; } public void setEffectiveDate(LocalDateTime v) { this.effectiveDate = v; }
        public LocalDateTime getUploadedAt() { return uploadedAt; } public void setUploadedAt(LocalDateTime v) { this.uploadedAt = v; }
        public Set<PersonDto.Summary> getPersons() { return persons; } public void setPersons(Set<PersonDto.Summary> v) { this.persons = v; }
        public Set<TagDto.Response> getTags() { return tags; } public void setTags(Set<TagDto.Response> v) { this.tags = v; }
    }
}
