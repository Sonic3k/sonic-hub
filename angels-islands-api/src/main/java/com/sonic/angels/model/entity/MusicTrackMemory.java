package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/**
 * A song and a memory of his: BACKGROUND = it plays behind that memory; TIED = he ties the two together; MENTIONED = the
 * memory speaks of it (a chat, a note).
 */
@Entity
@Table(name = "music_track_memories",
    uniqueConstraints = @UniqueConstraint(name = "uk_music_track_memory", columnNames = {"track_id", "episode_id"}),
    indexes = @Index(name = "idx_music_track_memory_episode", columnList = "episode_id"))
public class MusicTrackMemory extends BaseEntity {

    public enum Role { BACKGROUND, TIED, MENTIONED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "track_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MusicTrack track;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "episode_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Episode episode;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 10)
    private Role role = Role.TIED;

    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public MusicTrackMemory() {}

    public UUID getId() { return id; }
    public MusicTrack getTrack() { return track; }
    public void setTrack(MusicTrack v) { this.track = v; }
    public Episode getEpisode() { return episode; }
    public void setEpisode(Episode v) { this.episode = v; }
    public Role getRole() { return role == null ? Role.TIED : role; }
    public void setRole(Role v) { this.role = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
}
