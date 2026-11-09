package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/** A page about a game somewhere else: a walkthrough or longplay on YouTube, a wiki, its manual, where his remake plays,
 *  its music (the Music section, later). */
@Entity
@Table(name = "game_links", indexes = @Index(name = "idx_game_link_game", columnList = "game_id"))
public class GameLink extends BaseEntity {

    public enum Kind { WALKTHROUGH, LONGPLAY, WIKI, MANUAL, OFFICIAL, PLAY, SOUNDTRACK, VIDEO, OTHER }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Game game;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 12)
    private Kind kind = Kind.OTHER;

    @Column(name = "title", length = 300)
    private String title;

    @Column(name = "url", nullable = false, length = 1000)
    private String url;

    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public GameLink() {}

    public UUID getId() { return id; }
    public Game getGame() { return game; }
    public void setGame(Game v) { this.game = v; }
    public Kind getKind() { return kind == null ? Kind.OTHER : kind; }
    public void setKind(Kind v) { this.kind = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getUrl() { return url; }
    public void setUrl(String v) { this.url = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
}
