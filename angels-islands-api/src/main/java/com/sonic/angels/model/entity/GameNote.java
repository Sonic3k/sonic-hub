package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/** Something he wrote that is about a game (a journal note, an article). Either one going removes the link. */
@Entity
@Table(name = "game_notes",
    uniqueConstraints = @UniqueConstraint(name = "uk_game_note", columnNames = {"game_id", "note_id"}),
    indexes = @Index(name = "idx_game_note_note", columnList = "note_id"))
public class GameNote extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Game game;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "note_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private JournalNote note;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public GameNote() {}

    public UUID getId() { return id; }
    public Game getGame() { return game; }
    public void setGame(Game v) { this.game = v; }
    public JournalNote getNote() { return note; }
    public void setNote(JournalNote v) { this.note = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
}
