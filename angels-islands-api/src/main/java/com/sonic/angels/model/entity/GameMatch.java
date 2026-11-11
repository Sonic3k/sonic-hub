package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/** One result written down between two sides of a game he played with others — a "kèo" of the office Age of Empires
 *  league: when, on which map, how many games each side took. Who stood on each side is in {@link GameMatchPlayer}.
 *  Matches come from a record he kept (the league's own data file) and are filed under the game that record belongs to. */
@Entity
@Table(name = "game_matches",
    uniqueConstraints = @UniqueConstraint(name = "uk_game_match_key", columnNames = {"game_id", "external_key"}),
    indexes = @Index(name = "idx_game_match_played", columnList = "game_id, played_at"))
public class GameMatch extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Game game;

    /** The record's own id where it comes from ("20170711_200336_021_00"). */
    @Column(name = "external_key", nullable = false, length = 120)
    private String externalKey;

    /** When the result was written down, as the wall clock where it was played showed it. */
    @Column(name = "played_at", nullable = false)
    private LocalDateTime playedAt;

    /** The map (or board, or mode) it was played on: "Gigantic". */
    @Column(name = "map_name", length = 120)
    private String map;

    /** Games side 1 took / games side 2 took in this pairing. */
    @Column(name = "score1")
    private Integer score1;

    @Column(name = "score2")
    private Integer score2;

    /** Anything else the record says about it ("Team 2: 1 Shang"). */
    @Column(name = "note", length = 500)
    private String note;

    public GameMatch() {}

    public UUID getId() { return id; }
    public Game getGame() { return game; }
    public void setGame(Game v) { this.game = v; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public LocalDateTime getPlayedAt() { return playedAt; }
    public void setPlayedAt(LocalDateTime v) { this.playedAt = v; }
    public String getMap() { return map; }
    public void setMap(String v) { this.map = v; }
    public Integer getScore1() { return score1; }
    public void setScore1(Integer v) { this.score1 = v; }
    public Integer getScore2() { return score2; }
    public void setScore2(Integer v) { this.score2 = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
}
