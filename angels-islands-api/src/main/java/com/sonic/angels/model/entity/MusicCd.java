package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A disc he owns: one edition of an album or single (Westlife "Coast To Coast (Japan Edition 2001)", Take That "Patience"
 * CD single). His scans and photos of it are {@link MusicCdMedia} — pictures of this disc, shown with its album too,
 * never its cover. sourceFolder = where he ripped it to ("D:\Music\Rip by Sonic3k\…").
 */
@Entity
@Table(name = "music_cds",
    uniqueConstraints = @UniqueConstraint(name = "uk_music_cd_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_music_cd_album", columnList = "album_id"))
public class MusicCd extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 200)
    private String externalKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "album_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private MusicAlbum album;

    /** As he named it: "Westlife - Coast To Coast (Japan Edition 2001)". */
    @Column(name = "title", nullable = false, length = 300)
    private String title;

    /** "Japan Edition 2001", "EU Special Edition", "CD1". */
    @Column(name = "edition", length = 200)
    private String edition;

    /** CD, CD single, DVD… */
    @Column(name = "format", length = 40)
    private String format;

    @Column(name = "discs")
    private Integer discs;

    /** When he got it, as far as it is known. */
    @Column(name = "acquired_at")
    private LocalDateTime acquiredAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "acquired_precision", length = 10)
    private DatePrecision acquiredPrecision;

    @Column(name = "acquired_approx")
    private Boolean acquiredApprox;

    /** Where from: "eBay", "Tower Records", a gift. */
    @Column(name = "acquired_via", length = 200)
    private String acquiredVia;

    @Column(name = "source_folder", length = 500)
    private String sourceFolder;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "source", length = 40)
    private String source;

    public MusicCd() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public MusicAlbum getAlbum() { return album; }
    public void setAlbum(MusicAlbum v) { this.album = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getEdition() { return edition; }
    public void setEdition(String v) { this.edition = v; }
    public String getFormat() { return format; }
    public void setFormat(String v) { this.format = v; }
    public Integer getDiscs() { return discs; }
    public void setDiscs(Integer v) { this.discs = v; }
    public LocalDateTime getAcquiredAt() { return acquiredAt; }
    public void setAcquiredAt(LocalDateTime v) { this.acquiredAt = v; }
    public DatePrecision getAcquiredPrecision() { return acquiredPrecision; }
    public void setAcquiredPrecision(DatePrecision v) { this.acquiredPrecision = v; }
    public Boolean getAcquiredApprox() { return acquiredApprox; }
    public void setAcquiredApprox(Boolean v) { this.acquiredApprox = v; }
    public String getAcquiredVia() { return acquiredVia; }
    public void setAcquiredVia(String v) { this.acquiredVia = v; }
    public String getSourceFolder() { return sourceFolder; }
    public void setSourceFolder(String v) { this.sourceFolder = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public String getSource() { return source; }
    public void setSource(String v) { this.source = v; }
}
