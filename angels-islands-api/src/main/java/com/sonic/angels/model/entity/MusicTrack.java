package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One recording of a song he listens to ("Flying Without Wings", and its live version from the BBC Proms as another
 * one, pointing at the studio one through {@link #versionOf}). Its audio is a file in the music folder of the bucket
 * (audio*), played through /api/music/tracks/{key}/audio; links to YouTube, Spotify… are {@link MusicLink}s, so a song
 * can also live by a link only. firstHeard* = when he started listening to it, as far as it is known, and what shows it.
 */
@Entity
@Table(name = "music_tracks",
    uniqueConstraints = @UniqueConstraint(name = "uk_music_track_key", columnNames = "external_key"),
    indexes = {
        @Index(name = "idx_music_track_artist", columnList = "artist_id"),
        @Index(name = "idx_music_track_album", columnList = "album_id"),
        @Index(name = "idx_music_track_hash", columnList = "audio_hash")
    })
public class MusicTrack extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** "westlife--flying-without-wings", "westlife--flying-without-wings--live-bbc-proms-2011". */
    @Column(name = "external_key", nullable = false, length = 200)
    private String externalKey;

    /** The song's title, without the version. */
    @Column(name = "title", nullable = false, length = 300)
    private String title;

    /** Which recording, when not the plain one: "Acoustic Version", "Live at Abbey Road", "2006 Remix". */
    @Column(name = "version", length = 200)
    private String version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artist_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private MusicArtist artist;

    /** Who sings along, as credited: "Delta Goodrem", "Mariah Carey". */
    @Column(name = "featuring", length = 300)
    private String featuring;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "album_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private MusicAlbum album;

    @Column(name = "track_no")
    private Integer trackNo;

    @Column(name = "release_year")
    private Integer releaseYear;

    @Column(name = "duration_sec")
    private Integer durationSec;

    /** Language it is sung in: en, vi, fr, it… */
    @Column(name = "language", length = 8)
    private String language;

    @Column(name = "genre", length = 120)
    private String genre;

    /** The recording this one is another version of. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_of_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private MusicTrack versionOf;

    /** 1 to 5; none = not rated. */
    @Column(name = "favorite")
    private Integer favorite;

    /** When he started listening to it: the start of the span it is known to. */
    @Column(name = "first_heard_at")
    private LocalDateTime firstHeardAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "first_heard_precision", length = 10)
    private DatePrecision firstHeardPrecision;

    @Column(name = "first_heard_approx")
    private Boolean firstHeardApprox;

    /** What shows it: "file dated 05/03/2017", "first in the list My list 2008 (2005 → 2008)". */
    @Column(name = "first_heard_evidence", length = 2000)
    private String firstHeardEvidence;

    /** What the song is. */
    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    /** His own words: what it means to him, where it takes him back to. */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    // ── its audio, in the music folder of the bucket ─────────────────────────

    /** Full object key: "music/audio/<track key>/<file name>". */
    @Column(name = "audio_storage_key", length = 500)
    private String audioStorageKey;

    @Column(name = "audio_file_name", length = 300)
    private String audioFileName;

    @Column(name = "audio_size")
    private Long audioSize;

    /** SHA-256 of the file. */
    @Column(name = "audio_hash", length = 64)
    private String audioHash;

    @Column(name = "audio_mime", length = 100)
    private String audioMime;

    /** kbps */
    @Column(name = "audio_bitrate")
    private Integer audioBitrate;

    /** Where the file came from on his disk: "D:\Music\My list\My list 2005\Babe.mp3". */
    @Column(name = "audio_source_path", length = 1000)
    private String audioSourcePath;

    @Column(name = "source", length = 40)
    private String source;

    public MusicTrack() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getVersion() { return version; }
    public void setVersion(String v) { this.version = v; }
    public MusicArtist getArtist() { return artist; }
    public void setArtist(MusicArtist v) { this.artist = v; }
    public String getFeaturing() { return featuring; }
    public void setFeaturing(String v) { this.featuring = v; }
    public MusicAlbum getAlbum() { return album; }
    public void setAlbum(MusicAlbum v) { this.album = v; }
    public Integer getTrackNo() { return trackNo; }
    public void setTrackNo(Integer v) { this.trackNo = v; }
    public Integer getReleaseYear() { return releaseYear; }
    public void setReleaseYear(Integer v) { this.releaseYear = v; }
    public Integer getDurationSec() { return durationSec; }
    public void setDurationSec(Integer v) { this.durationSec = v; }
    public String getLanguage() { return language; }
    public void setLanguage(String v) { this.language = v; }
    public String getGenre() { return genre; }
    public void setGenre(String v) { this.genre = v; }
    public MusicTrack getVersionOf() { return versionOf; }
    public void setVersionOf(MusicTrack v) { this.versionOf = v; }
    public Integer getFavorite() { return favorite; }
    public void setFavorite(Integer v) { this.favorite = v; }
    public LocalDateTime getFirstHeardAt() { return firstHeardAt; }
    public void setFirstHeardAt(LocalDateTime v) { this.firstHeardAt = v; }
    public DatePrecision getFirstHeardPrecision() { return firstHeardPrecision; }
    public void setFirstHeardPrecision(DatePrecision v) { this.firstHeardPrecision = v; }
    public Boolean getFirstHeardApprox() { return firstHeardApprox; }
    public void setFirstHeardApprox(Boolean v) { this.firstHeardApprox = v; }
    public String getFirstHeardEvidence() { return firstHeardEvidence; }
    public void setFirstHeardEvidence(String v) { this.firstHeardEvidence = v; }
    public String getSummary() { return summary; }
    public void setSummary(String v) { this.summary = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public String getAudioStorageKey() { return audioStorageKey; }
    public void setAudioStorageKey(String v) { this.audioStorageKey = v; }
    public String getAudioFileName() { return audioFileName; }
    public void setAudioFileName(String v) { this.audioFileName = v; }
    public Long getAudioSize() { return audioSize; }
    public void setAudioSize(Long v) { this.audioSize = v; }
    public String getAudioHash() { return audioHash; }
    public void setAudioHash(String v) { this.audioHash = v; }
    public String getAudioMime() { return audioMime; }
    public void setAudioMime(String v) { this.audioMime = v; }
    public Integer getAudioBitrate() { return audioBitrate; }
    public void setAudioBitrate(Integer v) { this.audioBitrate = v; }
    public String getAudioSourcePath() { return audioSourcePath; }
    public void setAudioSourcePath(String v) { this.audioSourcePath = v; }
    public String getSource() { return source; }
    public void setSource(String v) { this.source = v; }
}
