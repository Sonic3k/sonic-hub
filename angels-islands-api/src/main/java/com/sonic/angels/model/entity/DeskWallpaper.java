package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/** A desktop (or lock screen) picture over a period: one of his photos, or a picture drawn into the app (builtin). */
@Entity
@Table(name = "desk_wallpapers",
    uniqueConstraints = @UniqueConstraint(name = "uk_desk_wallpaper_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_desk_wallpaper_device", columnList = "device_id"))
public class DeskWallpaper extends BaseEntity {
    public enum Place { DESKTOP, LOCK }
    public enum Fit { FILL, FIT, CENTER, TILE, STRETCH }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 200)
    private String externalKey;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private DeskDevice device;

    @Enumerated(EnumType.STRING)
    @Column(name = "place", nullable = false, length = 10)
    private Place place = Place.DESKTOP;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "media_file_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MediaFile mediaFile;

    @Column(name = "builtin", length = 60)
    private String builtin;

    @Enumerated(EnumType.STRING)
    @Column(name = "fit", nullable = false, length = 10)
    private Fit fit = Fit.FILL;

    /** #RRGGBB behind a centred or fitted picture. */
    @Column(name = "color", length = 16)
    private String color;

    @Column(name = "is_default")
    private Boolean isDefault;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_to")
    private LocalDateTime validTo;

    @Column(name = "note", length = 2000)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public DeskWallpaper() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public DeskDevice getDevice() { return device; }
    public void setDevice(DeskDevice v) { this.device = v; }
    public Place getPlace() { return place; }
    public void setPlace(Place v) { this.place = v; }
    public MediaFile getMediaFile() { return mediaFile; }
    public void setMediaFile(MediaFile v) { this.mediaFile = v; }
    public String getBuiltin() { return builtin; }
    public void setBuiltin(String v) { this.builtin = v; }
    public Fit getFit() { return fit; }
    public void setFit(Fit v) { this.fit = v; }
    public String getColor() { return color; }
    public void setColor(String v) { this.color = v; }
    public Boolean getIsDefault() { return isDefault; }
    public void setIsDefault(Boolean v) { this.isDefault = v; }
    public LocalDateTime getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDateTime v) { this.validFrom = v; }
    public LocalDateTime getValidTo() { return validTo; }
    public void setValidTo(LocalDateTime v) { this.validTo = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
}
