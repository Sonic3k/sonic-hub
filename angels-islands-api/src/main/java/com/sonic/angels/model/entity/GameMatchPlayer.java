package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/** Someone on one side of a {@link GameMatch}, under the name the record has for them at that time. */
@Entity
@Table(name = "game_match_players", indexes = @Index(name = "idx_game_match_player_match", columnList = "match_id"))
public class GameMatchPlayer extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private GameMatch match;

    /** 1 or 2. */
    @Column(name = "side", nullable = false)
    private Integer side;

    /** Place inside the side, as the record lists them. */
    @Column(name = "position")
    private Integer position;

    /** The nick as written in that record (a player may go by another one later). */
    @Column(name = "name", nullable = false, length = 120)
    private String name;

    /** This one is him. */
    @Column(name = "is_self")
    private Boolean self;

    /** The player's points once this result was counted, when the record keeps a rating. */
    @Column(name = "rating")
    private Double rating;

    public GameMatchPlayer() {}

    public UUID getId() { return id; }
    public GameMatch getMatch() { return match; }
    public void setMatch(GameMatch v) { this.match = v; }
    public Integer getSide() { return side; }
    public void setSide(Integer v) { this.side = v; }
    public Integer getPosition() { return position; }
    public void setPosition(Integer v) { this.position = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public Boolean getSelf() { return self; }
    public void setSelf(Boolean v) { this.self = v; }
    public Double getRating() { return rating; }
    public void setRating(Double v) { this.rating = v; }
}
