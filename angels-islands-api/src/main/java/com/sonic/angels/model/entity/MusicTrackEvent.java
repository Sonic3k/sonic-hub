package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/** A song and an event of his life, with the same roles as {@link MusicTrackMemory}. */
@Entity
@Table(name = "music_track_events",
    uniqueConstraints = @UniqueConstraint(name = "uk_music_track_event", columnNames = {"track_id", "event_id"}),
    indexes = @Index(name = "idx_music_track_event_event", columnList = "event_id"))
public class MusicTrackEvent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "track_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MusicTrack track;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private LifeEvent event;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 10)
    private MusicTrackMemory.Role role = MusicTrackMemory.Role.TIED;

    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public MusicTrackEvent() {}

    public UUID getId() { return id; }
    public MusicTrack getTrack() { return track; }
    public void setTrack(MusicTrack v) { this.track = v; }
    public LifeEvent getEvent() { return event; }
    public void setEvent(LifeEvent v) { this.event = v; }
    public MusicTrackMemory.Role getRole() { return role == null ? MusicTrackMemory.Role.TIED : role; }
    public void setRole(MusicTrackMemory.Role v) { this.role = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
}
