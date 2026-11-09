package com.sonic.angels.model.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** His music: artists, albums, recordings, the CDs he owns and the lists he kept. See {@link com.sonic.angels.model.entity.MusicTrack}. */
public class MusicDto {

    // ── read ────────────────────────────────────────────────────────────────

    public record ArtistRef(String key, String name, String country) {}
    public record AlbumRef(String key, String title, Integer releaseYear) {}
    public record PlaylistRef(String key, String title, String kind, String when) {}

    /** An artist as the lists show it; tracks / albums = how many of each are his. */
    public static class Artist {
        public UUID id;
        public String key, name, kind, country, summary, note;
        public ArtistRef parent;
        public Integer favorite;
        public int tracks, albums;
        /** the artists who came from it (a group's members who went solo) */
        public List<ArtistRef> members;
    }

    public static class ArtistDetail extends Artist {
        public UUID imageMediaId;
        public List<Album> albumList;
        public List<Track> trackList;
    }

    public static class Album {
        public UUID id;
        public String key, title, kind, coverUrl, summary, note;
        public ArtistRef artist;
        public Integer releaseYear, favorite;
        public int tracks, cds;
    }

    public static class AlbumDetail extends Album {
        public UUID coverMediaId;
        public List<Track> trackList;
        public List<Cd> cdList;
    }

    /** A recording as the lists show it. audioUrl = the API path its file plays from (none = no file, maybe links only);
     *  playlists = keys of the lists it is in; firstHeard = when he started listening to it, as text. */
    public static class Track {
        public UUID id;
        public String key, title, version, featuring, language, genre, firstHeard, firstHeardPrecision, firstHeardEvidence, audioUrl, versionOfKey;
        public ArtistRef artist;
        public AlbumRef album;
        public Integer favorite, releaseYear, durationSec, trackNo;
        public LocalDateTime firstHeardAt;
        public boolean firstHeardApprox, hasAudio;
        public List<String> playlists;
    }

    public static class TrackDetail extends Track {
        public String summary, note, audioFileName, audioMime, audioSourcePath;
        public Long audioSize;
        public Integer audioBitrate;
        public List<Link> links;
        public List<MemoryLink> memories;
        public List<EventLink> events;
        public List<PlaylistRef> inPlaylists;
        /** the other recordings of the same song */
        public List<Track> versions;
    }

    public static class Link {
        public UUID id;
        public String kind, title, url, note;
    }

    /** A memory the song is in: role = BACKGROUND | TIED | MENTIONED. */
    public static class MemoryLink {
        public UUID id;
        public String title, summary, when, kind, role, note, coverUrl;
        public LocalDateTime occurredAt;
    }

    public static class EventLink {
        public UUID id;
        public String title, when, kind, role, note;
        public LocalDateTime startAt;
    }

    public static class Cd {
        public UUID id;
        public String key, title, edition, format, acquired, acquiredVia, sourceFolder, note;
        public AlbumRef album;
        public ArtistRef artist;
        public Integer discs;
        public LocalDateTime acquiredAt;
        public List<CdMedia> media;
    }

    /** A photo or scan of a CD: the role it has there and the file as the media endpoints give it. */
    public static class CdMedia {
        public UUID linkId;
        public String role, label;
        public MediaFileDto.Response media;
    }

    /** A checkpoint list. when = its moment as text; windowFrom → takenEnd = the stretch a WINDOW list covers. */
    public static class Playlist {
        public UUID id;
        public String key, title, kind, when, deviceKey, deviceName, eventTitle, sourceFolder, summary, note;
        public UUID eventId;
        public LocalDateTime takenAt, takenEnd, windowFrom;
        public Integer sortOrder;
        public int tracks, withAudio;
    }

    public static class PlaylistDetail extends Playlist {
        public List<Entry> entries;
    }

    public static class Entry {
        public Integer position;
        public String fileName, note;
        public LocalDateTime fileModifiedAt;
        public Track track;
    }

    /** The music of a moment: the WINDOW lists that cover it, the last FULL list before it, and their songs that play. */
    public static class Moment {
        public LocalDateTime at;
        public List<Playlist> windows;
        public Playlist full;
        public List<Track> tracks;
    }

    // ── write ───────────────────────────────────────────────────────────────
    // Fields left out (null) keep what is there; empty strings clear text; favorite 0 clears; the nil uuid clears a
    // picture; a list given replaces what it covers.

    public static class ArtistIn {
        public String key, name, kind, country, parentKey, summary, note;
        public Integer favorite;
        public UUID imageMediaId;
    }

    public static class AlbumIn {
        public String key, title, artistKey, kind, summary, note;
        public Integer releaseYear, favorite;
        public UUID coverMediaId;
    }

    /** firstHeard: yyyy | yyyy-MM | yyyy-MM-dd | yyyy-MM-ddTHH:mm (precision defaults to its form). */
    public static class TrackIn {
        public String key, title, version, artistKey, featuring, albumKey, language, genre, versionOfKey, summary, note,
            firstHeard, firstHeardPrecision, firstHeardEvidence;
        public Boolean firstHeardApprox;
        public Integer trackNo, releaseYear, durationSec, favorite;
        public List<LinkIn> links;
        public List<TieIn> memories, events;
    }

    public static class LinkIn {
        public String kind, title, url, note;
    }

    /** A memory (episode id) or an event (life event id), and how the song goes with it. */
    public static class TieIn {
        public UUID id;
        public String role, note;
    }

    public static class CdIn {
        public String key, albumKey, title, edition, format, acquired, acquiredPrecision, acquiredVia, sourceFolder, note;
        public Boolean acquiredApprox;
        public Integer discs;
        public List<MediaIn> media;
    }

    public static class MediaIn {
        public UUID mediaId;
        public String role, label;
    }

    /** taken / windowFrom as firstHeard; device = a desk device key. */
    public static class PlaylistIn {
        public String key, title, kind, taken, takenPrecision, windowFrom, device, sourceFolder, summary, note;
        public Boolean takenApprox;
        public UUID eventId;
        public Integer sortOrder;
        public List<EntryIn> entries;
    }

    /** track = a recording key; fileModifiedAt = yyyy-MM-ddTHH:mm[:ss] (Vietnam wall clock). */
    public static class EntryIn {
        public String track, fileName, fileModifiedAt, note;
        public Integer position;
    }

    public static class Delete {
        public List<String> artists, albums, tracks, cds, playlists;
    }

    /** Everything an importer keeps, written at once (matched by key); source names it on what it creates. */
    public static class Sync {
        public String source;
        public List<ArtistIn> artists;
        public List<AlbumIn> albums;
        public List<TrackIn> tracks;
        public List<CdIn> cds;
        public List<PlaylistIn> playlists;
        public Delete delete;
    }

    public record SyncResult(Map<String, Map<String, Integer>> counts, List<String> warnings) {}
}
