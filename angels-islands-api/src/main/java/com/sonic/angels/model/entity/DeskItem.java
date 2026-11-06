package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Something on a device over a period: a desktop icon, a Start menu entry, a taskbar pin, a browser bookmark, an app
 * that opened on start-up, a phone home-screen icon. No device = every computer (or every phone, for HOME and DOCK).
 * app is what it opens (explorer, yahoo, browser, word…, or "link" for a site); target says where (a folder id, an URL).
 */
@Entity
@Table(name = "desk_items",
    uniqueConstraints = @UniqueConstraint(name = "uk_desk_item_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_desk_item_device", columnList = "device_id, place"))
public class DeskItem extends BaseEntity {
    public enum Place { DESKTOP, START, TASKBAR, TRAY, BOOKMARK, STARTUP, GADGET, HOME, DOCK }

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

    @Enumerated(EnumType.STRING)
    @Column(name = "place", nullable = false, length = 10)
    private Place place;

    @Column(name = "label", nullable = false, length = 200)
    private String label;

    @Column(name = "glyph", length = 60)
    private String glyph;

    @Column(name = "app", length = 60)
    private String app;

    @Column(name = "target", length = 1000)
    private String target;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_to")
    private LocalDateTime validTo;

    @Column(name = "note", length = 2000)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public DeskItem() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public DeskDevice getDevice() { return device; }
    public void setDevice(DeskDevice v) { this.device = v; }
    public Place getPlace() { return place; }
    public void setPlace(Place v) { this.place = v; }
    public String getLabel() { return label; }
    public void setLabel(String v) { this.label = v; }
    public String getGlyph() { return glyph; }
    public void setGlyph(String v) { this.glyph = v; }
    public String getApp() { return app; }
    public void setApp(String v) { this.app = v; }
    public String getTarget() { return target; }
    public void setTarget(String v) { this.target = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
    public LocalDateTime getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDateTime v) { this.validFrom = v; }
    public LocalDateTime getValidTo() { return validTo; }
    public void setValidTo(LocalDateTime v) { this.validTo = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
}
