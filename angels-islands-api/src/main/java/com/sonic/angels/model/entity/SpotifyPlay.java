package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One stream from his Spotify extended streaming history — the fact every report is counted from. playedAt = when the
 * stream ended (UTC, as Spotify gives it); localAt = the same moment on the wall clock of where he was, so hours and
 * weekdays read true; place = where he was by his own timeline (VN, US-CA, PH, a country on a trip), which is not always
 * the country the connection showed (a company VPN). device = the machine, read from the platform string. session = a
 * run of streams with no gap over half an hour. context / playlist = what the stream came from, read from the session
 * (Spotify keeps no such field): one of his lists, an album or an artist played through, or a loose song.
 */
@Entity
@Table(name = "spotify_plays",
    indexes = {
        @Index(name = "idx_spotify_play_local", columnList = "local_at"),
        @Index(name = "idx_spotify_play_track", columnList = "track_id"),
        @Index(name = "idx_spotify_play_playlist", columnList = "playlist_id")
    })
public class SpotifyPlay extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "played_at", nullable = false)
    private LocalDateTime playedAt;

    @Column(name = "local_at", nullable = false)
    private LocalDateTime localAt;

    @Column(name = "ms_played", nullable = false)
    private int msPlayed;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "track_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SpotifyTrack track;

    /** As Spotify gives it: "Windows 10 (10.0.18363; x64)", "iOS 13.3 (iPhone12,1)". */
    @Column(name = "platform", length = 160)
    private String platform;

    /** THINKPAD, WORK_PC, IPHONE_11… */
    @Column(name = "device", length = 16)
    private String device;

    /** The country of the connection (ISO code). */
    @Column(name = "country", length = 4)
    private String country;

    /** Where he was: VN, US-CA, PH, SG… */
    @Column(name = "place", length = 8)
    private String place;

    /** trackdone, fwdbtn, clickrow… */
    @Column(name = "reason_start", length = 40)
    private String reasonStart;

    @Column(name = "reason_end", length = 40)
    private String reasonEnd;

    @Column(name = "shuffle")
    private Boolean shuffle;

    @Column(name = "skipped")
    private Boolean skipped;

    @Column(name = "offline")
    private Boolean offline;

    @Column(name = "incognito")
    private Boolean incognito;

    @Column(name = "session_no")
    private Integer sessionNo;

    /** PLAYLIST | ALBUM | ARTIST | LOOSE */
    @Column(name = "context", length = 10)
    private String context;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "playlist_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private MusicPlaylist playlist;

    public SpotifyPlay() {}

    public UUID getId() { return id; }
    public LocalDateTime getPlayedAt() { return playedAt; }
    public void setPlayedAt(LocalDateTime v) { this.playedAt = v; }
    public LocalDateTime getLocalAt() { return localAt; }
    public void setLocalAt(LocalDateTime v) { this.localAt = v; }
    public int getMsPlayed() { return msPlayed; }
    public void setMsPlayed(int v) { this.msPlayed = v; }
    public SpotifyTrack getTrack() { return track; }
    public void setTrack(SpotifyTrack v) { this.track = v; }
    public String getPlatform() { return platform; }
    public void setPlatform(String v) { this.platform = v; }
    public String getDevice() { return device; }
    public void setDevice(String v) { this.device = v; }
    public String getCountry() { return country; }
    public void setCountry(String v) { this.country = v; }
    public String getPlace() { return place; }
    public void setPlace(String v) { this.place = v; }
    public String getReasonStart() { return reasonStart; }
    public void setReasonStart(String v) { this.reasonStart = v; }
    public String getReasonEnd() { return reasonEnd; }
    public void setReasonEnd(String v) { this.reasonEnd = v; }
    public Boolean getShuffle() { return shuffle; }
    public void setShuffle(Boolean v) { this.shuffle = v; }
    public Boolean getSkipped() { return skipped; }
    public void setSkipped(Boolean v) { this.skipped = v; }
    public Boolean getOffline() { return offline; }
    public void setOffline(Boolean v) { this.offline = v; }
    public Boolean getIncognito() { return incognito; }
    public void setIncognito(Boolean v) { this.incognito = v; }
    public Integer getSessionNo() { return sessionNo; }
    public void setSessionNo(Integer v) { this.sessionNo = v; }
    public String getContext() { return context; }
    public void setContext(String v) { this.context = v; }
    public MusicPlaylist getPlaylist() { return playlist; }
    public void setPlaylist(MusicPlaylist v) { this.playlist = v; }
}
