package com.sonic.angels.model.dto;

import com.sonic.angels.model.entity.MediaFile;
import java.util.UUID;
import java.time.LocalDateTime;
import java.util.Set;

public class MediaFileDto {

    public static class Response {
        private UUID id; private String fileName; private MediaFile.FileType fileType;
        private MediaFile.MediaCategory mediaCategory; private MediaFile.Orientation orientation;
        private Long fileSize; private Integer width; private Integer height; private Float aspectRatio;
        private Integer duration; private Boolean isFavorite; private Boolean isFeatured;
        private String mimeType; private String caption; private String cdnUrl; private String thumbnailUrl;
        private Boolean isAnimated;
        private LocalDateTime dateTaken; private LocalDateTime fileDateCreated;
        private LocalDateTime fileDateModified; private LocalDateTime effectiveDate; private LocalDateTime uploadedAt;
        private Double latitude; private Double longitude; private String displayedAddress;
        private ImageDetailDto imageDetail;
        private VideoDetailDto videoDetail;
        private Set<PersonDto.Summary> persons; private Set<TagDto.Response> tags;

        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
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
        public Boolean getIsAnimated() { return isAnimated; } public void setIsAnimated(Boolean v) { this.isAnimated = v; }
        public LocalDateTime getDateTaken() { return dateTaken; } public void setDateTaken(LocalDateTime v) { this.dateTaken = v; }
        public LocalDateTime getFileDateCreated() { return fileDateCreated; } public void setFileDateCreated(LocalDateTime v) { this.fileDateCreated = v; }
        public LocalDateTime getFileDateModified() { return fileDateModified; } public void setFileDateModified(LocalDateTime v) { this.fileDateModified = v; }
        public LocalDateTime getEffectiveDate() { return effectiveDate; } public void setEffectiveDate(LocalDateTime v) { this.effectiveDate = v; }
        public LocalDateTime getUploadedAt() { return uploadedAt; } public void setUploadedAt(LocalDateTime v) { this.uploadedAt = v; }
        public Double getLatitude() { return latitude; } public void setLatitude(Double v) { this.latitude = v; }
        public Double getLongitude() { return longitude; } public void setLongitude(Double v) { this.longitude = v; }
        public String getDisplayedAddress() { return displayedAddress; } public void setDisplayedAddress(String v) { this.displayedAddress = v; }
        public ImageDetailDto getImageDetail() { return imageDetail; } public void setImageDetail(ImageDetailDto v) { this.imageDetail = v; }
        public VideoDetailDto getVideoDetail() { return videoDetail; } public void setVideoDetail(VideoDetailDto v) { this.videoDetail = v; }
        public Set<PersonDto.Summary> getPersons() { return persons; } public void setPersons(Set<PersonDto.Summary> v) { this.persons = v; }
        public Set<TagDto.Response> getTags() { return tags; } public void setTags(Set<TagDto.Response> v) { this.tags = v; }
    }

    public static class ImageDetailDto {
        private String cameraMake; private String cameraModel; private String lensModel;
        private Integer iso; private Float focalLength; private Float aperture; private String shutterSpeed;
        private String colorSpace; private Boolean flashFired; private String whiteBalance;
        private String exposureMode; private String meteringMode; private String software;
        private Boolean isSelfie; private Boolean isScreenshot; private Boolean isPanorama; private Boolean isPortrait;

        public String getCameraMake() { return cameraMake; } public void setCameraMake(String v) { this.cameraMake = v; }
        public String getCameraModel() { return cameraModel; } public void setCameraModel(String v) { this.cameraModel = v; }
        public String getLensModel() { return lensModel; } public void setLensModel(String v) { this.lensModel = v; }
        public Integer getIso() { return iso; } public void setIso(Integer v) { this.iso = v; }
        public Float getFocalLength() { return focalLength; } public void setFocalLength(Float v) { this.focalLength = v; }
        public Float getAperture() { return aperture; } public void setAperture(Float v) { this.aperture = v; }
        public String getShutterSpeed() { return shutterSpeed; } public void setShutterSpeed(String v) { this.shutterSpeed = v; }
        public String getColorSpace() { return colorSpace; } public void setColorSpace(String v) { this.colorSpace = v; }
        public Boolean getFlashFired() { return flashFired; } public void setFlashFired(Boolean v) { this.flashFired = v; }
        public String getWhiteBalance() { return whiteBalance; } public void setWhiteBalance(String v) { this.whiteBalance = v; }
        public String getExposureMode() { return exposureMode; } public void setExposureMode(String v) { this.exposureMode = v; }
        public String getMeteringMode() { return meteringMode; } public void setMeteringMode(String v) { this.meteringMode = v; }
        public String getSoftware() { return software; } public void setSoftware(String v) { this.software = v; }
        public Boolean getIsSelfie() { return isSelfie; } public void setIsSelfie(Boolean v) { this.isSelfie = v; }
        public Boolean getIsScreenshot() { return isScreenshot; } public void setIsScreenshot(Boolean v) { this.isScreenshot = v; }
        public Boolean getIsPanorama() { return isPanorama; } public void setIsPanorama(Boolean v) { this.isPanorama = v; }
        public Boolean getIsPortrait() { return isPortrait; } public void setIsPortrait(Boolean v) { this.isPortrait = v; }
    }

    public static class VideoDetailDto {
        private String videoCodec; private String audioCodec; private Float fps; private Integer bitrate;

        public String getVideoCodec() { return videoCodec; } public void setVideoCodec(String v) { this.videoCodec = v; }
        public String getAudioCodec() { return audioCodec; } public void setAudioCodec(String v) { this.audioCodec = v; }
        public Float getFps() { return fps; } public void setFps(Float v) { this.fps = v; }
        public Integer getBitrate() { return bitrate; } public void setBitrate(Integer v) { this.bitrate = v; }
    }
}
