package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/** Which version of an app he had over a period: the browser went IE6 → Firefox → Chrome, Yahoo! Messenger 8 → 11. */
@Entity
@Table(name = "desk_app_versions",
    uniqueConstraints = @UniqueConstraint(name = "uk_desk_app_key", columnNames = "external_key"))
public class DeskAppVersion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 200)
    private String externalKey;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "device_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private DeskDevice device;

    @Column(name = "app", nullable = false, length = 60)
    private String app;

    @Column(name = "version", nullable = false, length = 40)
    private String version;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_to")
    private LocalDateTime validTo;

    @Column(name = "note", length = 2000)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public DeskAppVersion() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public DeskDevice getDevice() { return device; }
    public void setDevice(DeskDevice v) { this.device = v; }
    public String getApp() { return app; }
    public void setApp(String v) { this.app = v; }
    public String getVersion() { return version; }
    public void setVersion(String v) { this.version = v; }
    public LocalDateTime getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDateTime v) { this.validFrom = v; }
    public LocalDateTime getValidTo() { return validTo; }
    public void setValidTo(LocalDateTime v) { this.validTo = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
}
