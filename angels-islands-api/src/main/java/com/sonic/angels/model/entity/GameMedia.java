package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/**
 * A picture that belongs to a game. SCREENSHOT, PHOTO and SCAN are his own (what he captured, photographed or drew);
 * MAP, ART and ICON are files the shelf uses that are not his (stage maps he collected, the program's icon), kept as
 * ASSET media so they never show among his photos. The file going removes the link.
 */
@Entity
@Table(name = "game_media",
    uniqueConstraints = @UniqueConstraint(name = "uk_game_media", columnNames = {"game_id", "media_file_id"}),
    indexes = @Index(name = "idx_game_media_media", columnList = "media_file_id"))
public class GameMedia extends BaseEntity {

    public enum Role { SCREENSHOT, PHOTO, SCAN, MAP, ART, ICON;
        /** his own pictures (the rest are the shelf's files) */
        public boolean own() { return this == SCREENSHOT || this == PHOTO || this == SCAN; }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Game game;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "media_file_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MediaFile media;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 12)
    private Role role = Role.SCREENSHOT;

    /** What it shows, when the file's own caption does not say: "Angel Island Zone – Act 1". */
    @Column(name = "label", length = 300)
    private String label;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public GameMedia() {}

    public UUID getId() { return id; }
    public Game getGame() { return game; }
    public void setGame(Game v) { this.game = v; }
    public MediaFile getMedia() { return media; }
    public void setMedia(MediaFile v) { this.media = v; }
    public Role getRole() { return role == null ? Role.SCREENSHOT : role; }
    public void setRole(Role v) { this.role = v; }
    public String getLabel() { return label; }
    public void setLabel(String v) { this.label = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
}
