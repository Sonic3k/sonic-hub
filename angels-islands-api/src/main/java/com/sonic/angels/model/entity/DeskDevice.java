package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/** A computer or phone he used, from the day he got it (validFrom) to the day another took its place (validTo). */
@Entity
@Table(name = "desk_devices",
    uniqueConstraints = @UniqueConstraint(name = "uk_desk_device_key", columnNames = "external_key"))
public class DeskDevice extends BaseEntity {
    /** MUSIC_PLAYER = a music player he carried (his JVJ, his Sony): never a machine of the desk, only a device of his. */
    public enum Kind { DESKTOP, LAPTOP, PHONE, MUSIC_PLAYER;
        public boolean computer() { return this == DESKTOP || this == LAPTOP; }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 200)
    private String externalKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 10)
    private Kind kind;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "model", length = 200)
    private String model;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "photo_media_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private MediaFile photo;

    @Column(name = "screen_width")
    private Integer screenWidth;

    @Column(name = "screen_height")
    private Integer screenHeight;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_to")
    private LocalDateTime validTo;

    @Column(name = "note", length = 2000)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public DeskDevice() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public Kind getKind() { return kind; }
    public void setKind(Kind v) { this.kind = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public String getModel() { return model; }
    public void setModel(String v) { this.model = v; }
    public MediaFile getPhoto() { return photo; }
    public void setPhoto(MediaFile v) { this.photo = v; }
    public Integer getScreenWidth() { return screenWidth; }
    public void setScreenWidth(Integer v) { this.screenWidth = v; }
    public Integer getScreenHeight() { return screenHeight; }
    public void setScreenHeight(Integer v) { this.screenHeight = v; }
    public LocalDateTime getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDateTime v) { this.validFrom = v; }
    public LocalDateTime getValidTo() { return validTo; }
    public void setValidTo(LocalDateTime v) { this.validTo = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
}
