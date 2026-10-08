package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/** One row of a ranking: who (a person, or just the nick written in the sheet), rank, points, and the sheet's other
 *  columns as one JSON object — so a new column in next year's sheet needs no new table or column. */
@Entity
@Table(name = "ranking_entries", indexes = {
    @Index(name = "idx_rentry_ranking", columnList = "ranking_id"),
    @Index(name = "idx_rentry_person", columnList = "person_id")
})
public class RankingEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ranking_id", nullable = false)
    private Ranking ranking;

    /** Null when the person is not on the portal: the row then only keeps the nick. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id")
    private Person person;

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "rank")
    private Integer rank;

    @Column(name = "points")
    private Double points;

    /** An entry's own month when the list spans many (Moments: "2010-02"). */
    @Column(name = "period", length = 20)
    private String period;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metrics", columnDefinition = "jsonb")
    private Map<String, Object> metrics = new LinkedHashMap<>();

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public RankingEntry() {}

    public UUID getId() { return id; }
    public Ranking getRanking() { return ranking; }
    public void setRanking(Ranking ranking) { this.ranking = ranking; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public Integer getRank() { return rank; }
    public void setRank(Integer rank) { this.rank = rank; }
    public Double getPoints() { return points; }
    public void setPoints(Double points) { this.points = points; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public Map<String, Object> getMetrics() { return metrics; }
    public void setMetrics(Map<String, Object> metrics) { this.metrics = metrics == null ? new LinkedHashMap<>() : metrics; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
