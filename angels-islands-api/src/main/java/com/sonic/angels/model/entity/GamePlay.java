package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/** A stretch of time he played a game: from when to when (as far as known), on which machine, with what (an emulator,
 *  a console), which version, and what shows it (a save file's date, a screenshot, a memory). */
@Entity
@Table(name = "game_plays", indexes = @Index(name = "idx_game_play_game", columnList = "game_id"))
public class GamePlay extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Game game;

    /** Start of the span it is known to (2007-01-01 for "2007"). */
    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "start_precision", length = 10)
    private DatePrecision precision;

    @Column(name = "approx")
    private Boolean approx;

    /** Last day (or moment); null = it fits in its start's precision. */
    @Column(name = "end_at")
    private LocalDateTime endAt;

    /** The computer or phone it was played on, when known. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private DeskDevice device;

    /** What it was played with: "VisualBoyAdvance 1.7", "Nintendo Switch", "DOSBox". */
    @Column(name = "via", length = 120)
    private String via;

    /** Which version: "White", "Emerald (U)". */
    @Column(name = "version", length = 120)
    private String version;

    /** What shows it: "save file written 07/07/2009". */
    @Column(name = "evidence", length = 2000)
    private String evidence;

    @Column(name = "note", length = 2000)
    private String note;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public GamePlay() {}

    public UUID getId() { return id; }
    public Game getGame() { return game; }
    public void setGame(Game v) { this.game = v; }
    public LocalDateTime getStartAt() { return startAt; }
    public void setStartAt(LocalDateTime v) { this.startAt = v; }
    public DatePrecision getPrecision() { return precision; }
    public void setPrecision(DatePrecision v) { this.precision = v; }
    public Boolean getApprox() { return approx; }
    public void setApprox(Boolean v) { this.approx = v; }
    public LocalDateTime getEndAt() { return endAt; }
    public void setEndAt(LocalDateTime v) { this.endAt = v; }
    public DeskDevice getDevice() { return device; }
    public void setDevice(DeskDevice v) { this.device = v; }
    public String getVia() { return via; }
    public void setVia(String v) { this.via = v; }
    public String getVersion() { return version; }
    public void setVersion(String v) { this.version = v; }
    public String getEvidence() { return evidence; }
    public void setEvidence(String v) { this.evidence = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }

    /** First moment after the stretch (exclusive). */
    public LocalDateTime endExclusive() {
        if (endAt != null) return endAt.toLocalTime().equals(java.time.LocalTime.MIDNIGHT) ? endAt.plusDays(1) : endAt;
        return (precision != null ? precision : DatePrecision.DAY).end(startAt);
    }
}
