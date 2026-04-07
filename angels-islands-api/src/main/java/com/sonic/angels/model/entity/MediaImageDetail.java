package com.sonic.angels.model.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "media_image_detail")
public class MediaImageDetail {

    @Id
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "media_file_id")
    private MediaFile mediaFile;

    @Column(name = "camera_make") private String cameraMake;
    @Column(name = "camera_model") private String cameraModel;
    @Column(name = "lens_model") private String lensModel;
    @Column(name = "iso") private Integer iso;
    @Column(name = "focal_length") private Float focalLength;
    @Column(name = "aperture") private Float aperture;
    @Column(name = "shutter_speed") private String shutterSpeed;
    @Column(name = "color_space") private String colorSpace;
    @Column(name = "flash_fired") private Boolean flashFired;
    @Column(name = "white_balance") private String whiteBalance;
    @Column(name = "exposure_mode") private String exposureMode;
    @Column(name = "metering_mode") private String meteringMode;
    @Column(name = "software") private String software;
    @Column(name = "copyright") private String copyright;
    @Column(name = "image_description", columnDefinition = "TEXT") private String imageDescription;
    @Column(name = "exif_orientation") private Integer exifOrientation;
    @Column(name = "is_selfie") private Boolean isSelfie;
    @Column(name = "is_screenshot") private Boolean isScreenshot;
    @Column(name = "is_panorama") private Boolean isPanorama;
    @Column(name = "is_portrait") private Boolean isPortrait;
    @Column(name = "is_hdr") private Boolean isHdr;
    @Column(name = "is_raw") private Boolean isRaw;

    public MediaImageDetail() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public MediaFile getMediaFile() { return mediaFile; }
    public void setMediaFile(MediaFile mediaFile) { this.mediaFile = mediaFile; }
    public String getCameraMake() { return cameraMake; }
    public void setCameraMake(String v) { this.cameraMake = v; }
    public String getCameraModel() { return cameraModel; }
    public void setCameraModel(String v) { this.cameraModel = v; }
    public String getLensModel() { return lensModel; }
    public void setLensModel(String v) { this.lensModel = v; }
    public Integer getIso() { return iso; }
    public void setIso(Integer v) { this.iso = v; }
    public Float getFocalLength() { return focalLength; }
    public void setFocalLength(Float v) { this.focalLength = v; }
    public Float getAperture() { return aperture; }
    public void setAperture(Float v) { this.aperture = v; }
    public String getShutterSpeed() { return shutterSpeed; }
    public void setShutterSpeed(String v) { this.shutterSpeed = v; }
    public String getColorSpace() { return colorSpace; }
    public void setColorSpace(String v) { this.colorSpace = v; }
    public Boolean getFlashFired() { return flashFired; }
    public void setFlashFired(Boolean v) { this.flashFired = v; }
    public String getWhiteBalance() { return whiteBalance; }
    public void setWhiteBalance(String v) { this.whiteBalance = v; }
    public String getExposureMode() { return exposureMode; }
    public void setExposureMode(String v) { this.exposureMode = v; }
    public String getMeteringMode() { return meteringMode; }
    public void setMeteringMode(String v) { this.meteringMode = v; }
    public String getSoftware() { return software; }
    public void setSoftware(String v) { this.software = v; }
    public String getCopyright() { return copyright; }
    public void setCopyright(String v) { this.copyright = v; }
    public String getImageDescription() { return imageDescription; }
    public void setImageDescription(String v) { this.imageDescription = v; }
    public Integer getExifOrientation() { return exifOrientation; }
    public void setExifOrientation(Integer v) { this.exifOrientation = v; }
    public Boolean getIsSelfie() { return isSelfie; }
    public void setIsSelfie(Boolean v) { this.isSelfie = v; }
    public Boolean getIsScreenshot() { return isScreenshot; }
    public void setIsScreenshot(Boolean v) { this.isScreenshot = v; }
    public Boolean getIsPanorama() { return isPanorama; }
    public void setIsPanorama(Boolean v) { this.isPanorama = v; }
    public Boolean getIsPortrait() { return isPortrait; }
    public void setIsPortrait(Boolean v) { this.isPortrait = v; }
    public Boolean getIsHdr() { return isHdr; }
    public void setIsHdr(Boolean v) { this.isHdr = v; }
    public Boolean getIsRaw() { return isRaw; }
    public void setIsRaw(Boolean v) { this.isRaw = v; }
}
