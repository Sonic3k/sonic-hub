package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.UUID;

/** One Spotify track (its id in spotify:track:…): a release of a {@link SpotifySong}, with the album it is on. */
@Entity
@Table(name = "spotify_tracks",
    uniqueConstraints = @UniqueConstraint(name = "uk_spotify_track_id", columnNames = "spotify_id"),
    indexes = {
        @Index(name = "idx_spotify_track_song", columnList = "song_id"),
        @Index(name = "idx_spotify_track_album", columnList = "album_name")
    })
public class SpotifyTrack extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "spotify_id", nullable = false, length = 40)
    private String spotifyId;

    /** As Spotify names it: "Swear It Again - Radio Edit". */
    @Column(name = "name", nullable = false, length = 400)
    private String name;

    /** The performer first credited. */
    @Column(name = "artist_name", nullable = false, length = 300)
    private String artistName;

    /** Everyone credited, as his lists show it: "Bích Phương, Phuc Du, ViruSs". */
    @Column(name = "artists", length = 600)
    private String artists;

    @Column(name = "album_name", length = 400)
    private String albumName;

    /** The album's artist, as the streaming history names it. */
    @Column(name = "album_artist", length = 300)
    private String albumArtist;

    @Column(name = "duration_ms")
    private Integer durationMs;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "song_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SpotifySong song;

    public SpotifyTrack() {}

    public UUID getId() { return id; }
    public String getSpotifyId() { return spotifyId; }
    public void setSpotifyId(String v) { this.spotifyId = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public String getArtistName() { return artistName; }
    public void setArtistName(String v) { this.artistName = v; }
    public String getArtists() { return artists; }
    public void setArtists(String v) { this.artists = v; }
    public String getAlbumName() { return albumName; }
    public void setAlbumName(String v) { this.albumName = v; }
    public String getAlbumArtist() { return albumArtist; }
    public void setAlbumArtist(String v) { this.albumArtist = v; }
    public Integer getDurationMs() { return durationMs; }
    public void setDurationMs(Integer v) { this.durationMs = v; }
    public SpotifySong getSong() { return song; }
    public void setSong(SpotifySong v) { this.song = v; }
}
