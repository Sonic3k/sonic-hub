package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/** The operating system a device ran over a period (XP, then 7 after an upgrade…), with the colours and language it was set to. */
@Entity
@Table(name = "desk_systems",
    uniqueConstraints = @UniqueConstraint(name = "uk_desk_system_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_desk_system_device", columnList = "device_id"))
public class DeskSystem extends BaseEntity {
    public enum Os { WIN98, WINXP, VISTA, WIN7, WIN81, WIN10, WIN11, NOKIA_S40, NOKIA_S60, IOS6, IOS7, IOS }

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
    @Column(name = "os", nullable = false, length = 12)
    private Os os;

    /** #RRGGBB the taskbar/accent was set to (Windows 8 and later), when known. */
    @Column(name = "accent", length = 16)
    private String accent;

    @Column(name = "language", length = 8)
    private String language;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_to")
    private LocalDateTime validTo;

    @Column(name = "note", length = 2000)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public DeskSystem() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public DeskDevice getDevice() { return device; }
    public void setDevice(DeskDevice v) { this.device = v; }
    public Os getOs() { return os; }
    public void setOs(Os v) { this.os = v; }
    public String getAccent() { return accent; }
    public void setAccent(String v) { this.accent = v; }
    public String getLanguage() { return language; }
    public void setLanguage(String v) { this.language = v; }
    public LocalDateTime getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDateTime v) { this.validFrom = v; }
    public LocalDateTime getValidTo() { return validTo; }
    public void setValidTo(LocalDateTime v) { this.validTo = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
}
