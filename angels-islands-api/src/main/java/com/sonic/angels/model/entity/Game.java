package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/**
 * A game on his shelf ("Kệ game"): one he played (Pokémon Emerald, DYNA Blaster, Boom Online…), one he drew himself
 * (Mario 4 in a notebook), or one rebuilt from his drawings to be played (Tím 4). A pair of versions sold together
 * (Black & White, Sword & Shield) is one game; which of them he had is said by each {@link GamePlay}.
 * When he played it, its pictures, the memories it is in, links and the files that play it hang off it.
 */
@Entity
@Table(name = "games",
    uniqueConstraints = @UniqueConstraint(name = "uk_game_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_game_series", columnList = "series_id"))
public class Game extends BaseEntity {

    /** OFFICIAL = a published game; FAN = made by fans (Mario Forever); HOMEMADE = his own, on paper or in his head;
     *  REMAKE = one of his built so it can be played (Tím 4 from the Mario 4 notebook); REFERENCE = someone else's
     *  game he copied from the web to look at when he vibe-codes his own (never one he played back then, never his). */
    public enum Kind { OFFICIAL, FAN, HOMEMADE, REMAKE, REFERENCE }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Stable name in the address: "pokemon-emerald", "dyna-blaster". */
    @Column(name = "external_key", nullable = false, length = 120)
    private String externalKey;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "series_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private GameSeries series;

    /** Its place in the series' line (release order); his own drawn ones sit where they belong. */
    @Column(name = "series_order")
    private Integer seriesOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 12)
    private Kind kind = Kind.OFFICIAL;

    /** The game this one comes from: Tím 4 → Mario 4 → Super Mario Bros. 3. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "based_on_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Game basedOn;

    /** DOS, Windows, NES, SNES, Game Boy Advance, Nintendo DS, Switch, Online, Flash, Paper… (free text). */
    @Column(name = "platform", length = 80)
    private String platform;

    @Column(name = "release_year")
    private Integer releaseYear;

    @Column(name = "developer", length = 200)
    private String developer;

    @Column(name = "genre", length = 120)
    private String genre;

    /** The versions sold together, as said: "Black / White". */
    @Column(name = "versions", length = 200)
    private String versions;

    /** What the game is. */
    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    /** His own words about it (only ever his). */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    /** One of the games closest to him. */
    @Column(name = "favorite")
    private Boolean favorite;

    /** The picture shown for it (a media file id; none = its first picture, else its icon). */
    @Column(name = "cover_media_id")
    private UUID coverMediaId;

    /** The little picture of it: the icon he drew next to it in his 2004 list, or the program's own. */
    @Column(name = "icon_media_id")
    private UUID iconMediaId;

    /** The name as he wrote it in his game list of 2004 ("CHUOT", "DYANNA"), and its number there. */
    @Column(name = "hand_name", length = 120)
    private String handName;

    @Column(name = "hand_order")
    private Integer handOrder;

    /** Who wrote it in: null = by hand, else the importer's name. */
    @Column(name = "source", length = 40)
    private String source;

    public Game() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public GameSeries getSeries() { return series; }
    public void setSeries(GameSeries v) { this.series = v; }
    public Integer getSeriesOrder() { return seriesOrder; }
    public void setSeriesOrder(Integer v) { this.seriesOrder = v; }
    public Kind getKind() { return kind == null ? Kind.OFFICIAL : kind; }
    public void setKind(Kind v) { this.kind = v; }
    public Game getBasedOn() { return basedOn; }
    public void setBasedOn(Game v) { this.basedOn = v; }
    public String getPlatform() { return platform; }
    public void setPlatform(String v) { this.platform = v; }
    public Integer getReleaseYear() { return releaseYear; }
    public void setReleaseYear(Integer v) { this.releaseYear = v; }
    public String getDeveloper() { return developer; }
    public void setDeveloper(String v) { this.developer = v; }
    public String getGenre() { return genre; }
    public void setGenre(String v) { this.genre = v; }
    public String getVersions() { return versions; }
    public void setVersions(String v) { this.versions = v; }
    public String getSummary() { return summary; }
    public void setSummary(String v) { this.summary = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public Boolean getFavorite() { return favorite; }
    public void setFavorite(Boolean v) { this.favorite = v; }
    public UUID getCoverMediaId() { return coverMediaId; }
    public void setCoverMediaId(UUID v) { this.coverMediaId = v; }
    public UUID getIconMediaId() { return iconMediaId; }
    public void setIconMediaId(UUID v) { this.iconMediaId = v; }
    public String getHandName() { return handName; }
    public void setHandName(String v) { this.handName = v; }
    public Integer getHandOrder() { return handOrder; }
    public void setHandOrder(Integer v) { this.handOrder = v; }
    public String getSource() { return source; }
    public void setSource(String v) { this.source = v; }
}
