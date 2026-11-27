package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A song in a list: its place, the file as it was in that folder (name and date) and anything noted about it there.
 * A playlist changes over time: addedAt is the day the song came into it, removedAt the day it left (none = still in
 * it). Spotify keeps no trace of a song taken out, so an entry that has left was worked out from what the playlist
 * played back then; a date that was worked out rather than recorded says so (addedApprox, removedApprox).
 */
@Entity
@Table(name = "music_playlist_entries",
    uniqueConstraints = @UniqueConstraint(name = "uk_music_entry", columnNames = {"playlist_id", "track_id"}),
    indexes = @Index(name = "idx_music_entry_track", columnList = "track_id"))
public class MusicPlaylistEntry extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "playlist_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MusicPlaylist playlist;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "track_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private MusicTrack track;

    @Column(name = "position")
    private Integer position;

    /** The file's name in that folder: "Swear It Again (Radio Edit).mp3". */
    @Column(name = "file_name", length = 300)
    private String fileName;

    /** The file's own date in that folder (Vietnam wall clock). */
    @Column(name = "file_modified_at")
    private LocalDateTime fileModifiedAt;

    /** The day he put the song in the list, where the list keeps it (a Spotify playlist's "Date added"). */
    @Column(name = "added_at")
    private LocalDateTime addedAt;

    /** addedAt was worked out (the first day the playlist played the song), not recorded. */
    @Column(name = "added_approx")
    private Boolean addedApprox;

    /** The day the song left the list; none = it is in the list. */
    @Column(name = "removed_at")
    private LocalDateTime removedAt;

    /** removedAt was worked out (the day after the playlist last played the song), not recorded. */
    @Column(name = "removed_approx")
    private Boolean removedApprox;

    @Column(name = "note", length = 1000)
    private String note;

    public MusicPlaylistEntry() {}

    public UUID getId() { return id; }
    public MusicPlaylist getPlaylist() { return playlist; }
    public void setPlaylist(MusicPlaylist v) { this.playlist = v; }
    public MusicTrack getTrack() { return track; }
    public void setTrack(MusicTrack v) { this.track = v; }
    public Integer getPosition() { return position; }
    public void setPosition(Integer v) { this.position = v; }
    public String getFileName() { return fileName; }
    public void setFileName(String v) { this.fileName = v; }
    public LocalDateTime getFileModifiedAt() { return fileModifiedAt; }
    public void setFileModifiedAt(LocalDateTime v) { this.fileModifiedAt = v; }
    public LocalDateTime getAddedAt() { return addedAt; }
    public void setAddedAt(LocalDateTime v) { this.addedAt = v; }
    public Boolean getAddedApprox() { return addedApprox; }
    public void setAddedApprox(Boolean v) { this.addedApprox = v; }
    public LocalDateTime getRemovedAt() { return removedAt; }
    public void setRemovedAt(LocalDateTime v) { this.removedAt = v; }
    public Boolean getRemovedApprox() { return removedApprox; }
    public void setRemovedApprox(Boolean v) { this.removedApprox = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
}
