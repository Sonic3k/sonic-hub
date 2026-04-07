package com.sonic.angels.model.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "media_files")
public class MediaFile extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "storage_key", unique = true)
    private String storageKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_provider")
    private StorageProvider storageProvider = StorageProvider.B2;

    @Column(name = "video_provider")
    private String videoProvider;

    @Column(name = "video_id")
    private String videoId;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", nullable = false)
    private FileType fileType;

    @Enumerated(EnumType.STRING)
    @Column(name = "media_category")
    private MediaCategory mediaCategory;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Enumerated(EnumType.STRING)
    @Column(name = "orientation")
    private Orientation orientation;

    @Column(name = "aspect_ratio")
    private Float aspectRatio;

    @Column(name = "duration")
    private Integer duration;

    @Column(name = "is_favorite")
    private Boolean isFavorite = false;

    @Column(name = "is_featured")
    private Boolean isFeatured = false;

    @Column(name = "mime_type")
    private String mimeType;

    @Column(name = "is_animated")
    private Boolean isAnimated;

    @Column(name = "caption", columnDefinition = "TEXT")
    private String caption;

    @Column(name = "date_taken")
    private LocalDateTime dateTaken;

    @Column(name = "file_date_created")
    private LocalDateTime fileDateCreated;

    @Column(name = "file_date_modified")
    private LocalDateTime fileDateModified;

    @Column(name = "effective_date")
    private LocalDateTime effectiveDate;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "displayed_address")
    private String displayedAddress;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    // ── Detail tables (1:1) ──────────────────────────────────────────────────

    @OneToOne(mappedBy = "mediaFile", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private MediaImageDetail imageDetail;

    @OneToOne(mappedBy = "mediaFile", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private MediaVideoDetail videoDetail;

    @OneToOne(mappedBy = "mediaFile", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private MediaLocationDetail locationDetail;

    // ── Relations ────────────────────────────────────────────────────────────

    @ManyToMany
    @JoinTable(name = "media_file_persons",
        joinColumns = @JoinColumn(name = "media_file_id"),
        inverseJoinColumns = @JoinColumn(name = "person_id"))
    private Set<Person> persons = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "media_file_tags",
        joinColumns = @JoinColumn(name = "media_file_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();

    // ── Enums ────────────────────────────────────────────────────────────────

    public enum FileType { IMAGE, VIDEO }
    public enum MediaCategory { REGULAR, COVER, BANNER, AVATAR, SCREENSHOT, MEMORY }
    public enum Orientation { HORIZONTAL, VERTICAL, SQUARE }
    public enum StorageProvider { B2, FLICKR, GOOGLE_DRIVE, S3, EXTERNAL }

    // ── Methods ──────────────────────────────────────────────────────────────

    public MediaFile() {}

    @PrePersist
    @Override
    protected void onCreate() {
        super.onCreate();
        calculateEffectiveDate();
    }

    @PreUpdate
    @Override
    protected void onUpdate() {
        super.onUpdate();
        calculateEffectiveDate();
    }

    public void calculateEffectiveDate() {
        if (dateTaken != null) effectiveDate = dateTaken;
        else if (fileDateModified != null) effectiveDate = fileDateModified;
        else if (fileDateCreated != null) effectiveDate = fileDateCreated;
        else if (uploadedAt != null) effectiveDate = uploadedAt;
        else effectiveDate = LocalDateTime.now();
    }

    public void calculateOrientation() {
        if (width != null && height != null && width > 0 && height > 0) {
            this.aspectRatio = (float) width / height;
            if (Math.abs(aspectRatio - 1.0f) <= 0.05f) this.orientation = Orientation.SQUARE;
            else if (aspectRatio > 1.0f) this.orientation = Orientation.HORIZONTAL;
            else this.orientation = Orientation.VERTICAL;
        }
    }

    public boolean isVideo() { return fileType == FileType.VIDEO; }

    public MediaImageDetail getOrCreateImageDetail() {
        if (imageDetail == null) { imageDetail = new MediaImageDetail(); imageDetail.setMediaFile(this); }
        return imageDetail;
    }

    public MediaVideoDetail getOrCreateVideoDetail() {
        if (videoDetail == null) { videoDetail = new MediaVideoDetail(); videoDetail.setMediaFile(this); }
        return videoDetail;
    }

    public MediaLocationDetail getOrCreateLocationDetail() {
        if (locationDetail == null) { locationDetail = new MediaLocationDetail(); locationDetail.setMediaFile(this); }
        return locationDetail;
    }

    // ── Getters / Setters ────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String storageKey) { this.storageKey = storageKey; }
    public StorageProvider getStorageProvider() { return storageProvider; }
    public void setStorageProvider(StorageProvider storageProvider) { this.storageProvider = storageProvider; }
    public String getVideoProvider() { return videoProvider; }
    public void setVideoProvider(String videoProvider) { this.videoProvider = videoProvider; }
    public String getVideoId() { return videoId; }
    public void setVideoId(String videoId) { this.videoId = videoId; }
    public FileType getFileType() { return fileType; }
    public void setFileType(FileType fileType) { this.fileType = fileType; }
    public MediaCategory getMediaCategory() { return mediaCategory; }
    public void setMediaCategory(MediaCategory mediaCategory) { this.mediaCategory = mediaCategory; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }
    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }
    public Orientation getOrientation() { return orientation; }
    public void setOrientation(Orientation orientation) { this.orientation = orientation; }
    public Float getAspectRatio() { return aspectRatio; }
    public void setAspectRatio(Float aspectRatio) { this.aspectRatio = aspectRatio; }
    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }
    public Boolean getIsFavorite() { return isFavorite; }
    public void setIsFavorite(Boolean isFavorite) { this.isFavorite = isFavorite; }
    public Boolean getIsFeatured() { return isFeatured; }
    public void setIsFeatured(Boolean isFeatured) { this.isFeatured = isFeatured; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public Boolean getIsAnimated() { return isAnimated; }
    public void setIsAnimated(Boolean isAnimated) { this.isAnimated = isAnimated; }
    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }
    public LocalDateTime getDateTaken() { return dateTaken; }
    public void setDateTaken(LocalDateTime dateTaken) { this.dateTaken = dateTaken; }
    public LocalDateTime getFileDateCreated() { return fileDateCreated; }
    public void setFileDateCreated(LocalDateTime fileDateCreated) { this.fileDateCreated = fileDateCreated; }
    public LocalDateTime getFileDateModified() { return fileDateModified; }
    public void setFileDateModified(LocalDateTime fileDateModified) { this.fileDateModified = fileDateModified; }
    public LocalDateTime getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDateTime effectiveDate) { this.effectiveDate = effectiveDate; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public String getDisplayedAddress() { return displayedAddress; }
    public void setDisplayedAddress(String displayedAddress) { this.displayedAddress = displayedAddress; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
    public MediaImageDetail getImageDetail() { return imageDetail; }
    public void setImageDetail(MediaImageDetail imageDetail) { this.imageDetail = imageDetail; }
    public MediaVideoDetail getVideoDetail() { return videoDetail; }
    public void setVideoDetail(MediaVideoDetail videoDetail) { this.videoDetail = videoDetail; }
    public MediaLocationDetail getLocationDetail() { return locationDetail; }
    public void setLocationDetail(MediaLocationDetail locationDetail) { this.locationDetail = locationDetail; }
    public Set<Person> getPersons() { return persons; }
    public void setPersons(Set<Person> persons) { this.persons = persons; }
    public Set<Tag> getTags() { return tags; }
    public void setTags(Set<Tag> tags) { this.tags = tags; }
}
