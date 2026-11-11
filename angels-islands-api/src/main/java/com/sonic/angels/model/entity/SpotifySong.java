package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/**
 * A song as his Spotify history knows it: one recording by one artist, whatever release it was streamed from (the radio
 * edit, a remaster and the album cut are one song; an acoustic take or a remix is another). Its plays hang off the
 * {@link SpotifyTrack}s that are it. When the song is also in his music ({@link MusicTrack}) the two are tied here;
 * assessment = what his listening says about it, in plain words.
 */
@Entity
@Table(name = "spotify_songs",
    uniqueConstraints = @UniqueConstraint(name = "uk_spotify_song_key", columnNames = "song_key"),
    indexes = {
        @Index(name = "idx_spotify_song_artist", columnList = "artist_name"),
        @Index(name = "idx_spotify_song_music_track", columnList = "music_track_id")
    })
public class SpotifySong extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** artist | title [| version], without marks, case or punctuation: "westlife|hellomylove|acoustic". */
    @Column(name = "song_key", nullable = false, length = 300)
    private String songKey;

    @Column(name = "title", nullable = false, length = 400)
    private String title;

    /** Which recording, when not the plain one: "Acoustic", "John Gibbons Remix". */
    @Column(name = "version", length = 200)
    private String version;

    /** The performer first credited. */
    @Column(name = "artist_name", nullable = false, length = 300)
    private String artistName;

    /** The same song in his music, when it is there. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "music_track_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private MusicTrack musicTrack;

    @Column(name = "assessment", columnDefinition = "TEXT")
    private String assessment;

    public SpotifySong() {}

    public UUID getId() { return id; }
    public String getSongKey() { return songKey; }
    public void setSongKey(String v) { this.songKey = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getVersion() { return version; }
    public void setVersion(String v) { this.version = v; }
    public String getArtistName() { return artistName; }
    public void setArtistName(String v) { this.artistName = v; }
    public MusicTrack getMusicTrack() { return musicTrack; }
    public void setMusicTrack(MusicTrack v) { this.musicTrack = v; }
    public String getAssessment() { return assessment; }
    public void setAssessment(String v) { this.assessment = v; }
}
