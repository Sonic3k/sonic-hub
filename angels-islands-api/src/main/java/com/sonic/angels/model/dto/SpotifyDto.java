package com.sonic.angels.model.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** His Spotify streaming history, as it is written in and as the reports read it. See {@link com.sonic.angels.model.entity.SpotifyPlay}. */
public class SpotifyDto {

    // ── write ───────────────────────────────────────────────────────────────

    /** trackKey = the recording in his music it is (blank unties); assessment: blank clears; both left out = kept. */
    public static class SongIn {
        public String key, title, version, artist, trackKey, assessment;
    }

    /** id = the Spotify track id; song = a song key. */
    public static class TrackIn {
        public String id, name, artist, artists, album, albumArtist, song;
        public Integer durationMs;
    }

    /** at = when it ended (UTC), local = the same on his wall clock: yyyy-MM-ddTHH:mm:ss. track = a Spotify track id;
     *  playlist = a list key. */
    public static class PlayIn {
        public String at, local, track, platform, device, country, place, start, end, context, playlist;
        public int ms;
        public Boolean shuffle, skipped, offline, incognito;
        public Integer session;
    }

    /** Songs and tracks are matched by key / id; plays are added (reset = every play is removed first). */
    public static class Sync {
        public Boolean reset;
        public List<SongIn> songs;
        public List<TrackIn> tracks;
        public List<PlayIn> plays;
    }

    public record SyncResult(Map<String, Integer> counts, List<String> warnings) {}

    // ── read ────────────────────────────────────────────────────────────────

    /** starts = every stream; plays = the ones of 30 seconds or more (what Spotify counts as a play); ms = time played.
     *  songs, artists, days, first and last are counted on plays: a song passed by within half a minute is not one he listened to. */
    public static class Totals {
        public long starts, plays, ms;
        public int songs, artists, days;
        public LocalDateTime first, last;
    }

    /** One line of a report: what it is (key, label, sub) and its numbers. trackKey = the recording in his music (songs). */
    public static class Row {
        public String key, label, sub, version, trackKey;
        public long starts, plays, ms;
        public int songs, days;
        public LocalDateTime first, last;
    }

    /** A cell of a report cut by time: key = the line it belongs to (none = everything in the bucket). */
    public static class Point {
        public String bucket, key;
        public long plays, ms;
    }

    public static class Report {
        public Totals total;
        public List<Row> rows;
        public List<Point> series;
    }

    public static class Year {
        public String year;
        public Totals total;
        public Row topSong, topArtist, topPlaylist;
    }

    public static class Overview {
        public Totals total;
        public List<Year> years;
    }

    public record ListRef(String key, String title, LocalDateTime addedAt) {}
    public record TrackRef(String spotifyId, String name, String album, long plays) {}

    /** A song with what his listening says about it. picked = plays he chose himself (a click on the song); passed = times
     *  he pressed next on it; finished = times it played to its end. */
    public static class Song {
        public UUID id;
        public String key, title, version, artist, assessment;
        public Totals total;
        public long picked, passed, finished;
        public MusicDto.Track recording;
        public List<TrackRef> tracks;
        public List<ListRef> lists;
    }

    /** One stream of a day, in the order it happened. */
    public static class DayPlay {
        public LocalDateTime at;
        public int ms;
        public UUID songId;
        public String title, version, artist, album, device, place, context, playlistKey, playlistTitle, start, end;
        public Boolean shuffle;
    }
}
