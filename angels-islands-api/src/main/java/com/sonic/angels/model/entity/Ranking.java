package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * One ranked list at one moment: a "sonic3k relationship" sheet, an fb-association month, the Moments list, the chat
 * activity table… `board` says which kind; every list of every kind lives in this one table, its rows in ranking_entries.
 */
@Entity
@Table(name = "rankings",
    uniqueConstraints = @UniqueConstraint(name = "uk_ranking_board_period_variant", columnNames = {"board", "period", "variant"}),
    indexes = @Index(name = "idx_ranking_board", columnList = "board"))
public class Ranking extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "board", nullable = false, length = 40)
    private String board;            // relationship | fb-association | moments | chat-activity

    @Column(name = "period", nullable = false, length = 20)
    private String period;           // "2023.06", "2001-2021"

    /** "" for the normal list; e.g. "change score" for a re-scored copy of the same month. Never null (unique key). */
    @Column(name = "variant", nullable = false, length = 40)
    private String variant = "";

    @Column(name = "title")
    private String title;

    @Column(name = "taken_on")
    private LocalDate takenOn;

    @Column(name = "source")
    private String source;           // file it came from

    /** The metric columns of this list, in sheet order. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metric_columns", columnDefinition = "jsonb")
    private List<String> columns = new ArrayList<>();

    @OneToMany(mappedBy = "ranking", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<RankingEntry> entries = new ArrayList<>();

    public Ranking() {}

    public UUID getId() { return id; }
    public String getBoard() { return board; }
    public void setBoard(String board) { this.board = board; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public String getVariant() { return variant; }
    public void setVariant(String variant) { this.variant = variant == null ? "" : variant; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public LocalDate getTakenOn() { return takenOn; }
    public void setTakenOn(LocalDate takenOn) { this.takenOn = takenOn; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public List<String> getColumns() { return columns; }
    public void setColumns(List<String> columns) { this.columns = columns == null ? new ArrayList<>() : columns; }
    public List<RankingEntry> getEntries() { return entries; }
}
