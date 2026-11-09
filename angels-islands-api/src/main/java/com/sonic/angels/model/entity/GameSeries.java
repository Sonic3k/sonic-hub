package com.sonic.angels.model.entity;

import jakarta.persistence.*;

import java.util.UUID;

/** A line of games that belong together (Pokémon, Super Mario, Age of Empires…): its games are the {@link Game}s that
 *  point at it, his own drawn ones among them. */
@Entity
@Table(name = "game_series",
    uniqueConstraints = @UniqueConstraint(name = "uk_game_series_key", columnNames = "external_key"))
public class GameSeries extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Stable name in the address: "pokemon", "super-mario". */
    @Column(name = "external_key", nullable = false, length = 120)
    private String externalKey;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    /** The picture shown for it (a media file id; none = the cover of its first game). */
    @Column(name = "cover_media_id")
    private UUID coverMediaId;

    @Column(name = "sort_order")
    private Integer sortOrder;

    /** Who wrote it in: null = by hand, else the importer's name. */
    @Column(name = "source", length = 40)
    private String source;

    public GameSeries() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public String getSummary() { return summary; }
    public void setSummary(String v) { this.summary = v; }
    public UUID getCoverMediaId() { return coverMediaId; }
    public void setCoverMediaId(UUID v) { this.coverMediaId = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
    public String getSource() { return source; }
    public void setSource(String v) { this.source = v; }
}
