package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/** A memory (ký ức) a game is in — the summer of Boom, the Pokémon years in the US. Either one going removes the link. */
@Entity
@Table(name = "game_memories",
    uniqueConstraints = @UniqueConstraint(name = "uk_game_memory", columnNames = {"game_id", "episode_id"}),
    indexes = @Index(name = "idx_game_memory_episode", columnList = "episode_id"))
public class GameMemory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Game game;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "episode_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Episode episode;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public GameMemory() {}

    public UUID getId() { return id; }
    public Game getGame() { return game; }
    public void setGame(Game v) { this.game = v; }
    public Episode getEpisode() { return episode; }
    public void setEpisode(Episode v) { this.episode = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
}
