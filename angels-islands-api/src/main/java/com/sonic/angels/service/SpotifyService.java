package com.sonic.angels.service;

import com.sonic.angels.model.dto.MusicDto;
import com.sonic.angels.model.dto.SpotifyDto;
import com.sonic.angels.model.entity.MusicTrack;
import com.sonic.angels.model.entity.SpotifySong;
import com.sonic.angels.repository.MusicTrackRepository;
import com.sonic.angels.repository.SpotifySongRepository;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * His Spotify listening: every stream of his extended streaming history ({@link com.sonic.angels.model.entity.SpotifyPlay})
 * with the song it is, where he was, on what machine and what it came from — written by the importer (sync) and read
 * as reports: any one of its sides (time, song, artist, album, list, device, place, hour…) counted under any filter.
 */
@Service
@Transactional
public class SpotifyService {

    private static final String FROM = " FROM spotify_plays p JOIN spotify_tracks t ON t.id = p.track_id JOIN spotify_songs s ON s.id = t.song_id"
        + " LEFT JOIN music_playlists l ON l.id = p.playlist_id";
    private static final String METRICS = "COUNT(*) AS starts, COUNT(*) FILTER (WHERE p.ms_played >= 30000) AS plays, COALESCE(SUM(p.ms_played), 0) AS ms,"
        + " COUNT(DISTINCT t.song_id) AS songs, COUNT(DISTINCT CAST(p.local_at AS date)) AS days, MIN(p.local_at) AS first_at, MAX(p.local_at) AS last_at";

    /** A side a report can be counted by: the SQL of its key, of the name it shows, of the line under it. */
    private record Dim(String key, String label, String sub, boolean time) {}

    private static final Map<String, Dim> DIMS = new LinkedHashMap<>();
    static {
        DIMS.put("year", new Dim("to_char(p.local_at, 'YYYY')", null, null, true));
        DIMS.put("month", new Dim("to_char(p.local_at, 'YYYY-MM')", null, null, true));
        DIMS.put("day", new Dim("to_char(p.local_at, 'YYYY-MM-DD')", null, null, true));
        DIMS.put("hour", new Dim("to_char(p.local_at, 'HH24')", null, null, true));
        DIMS.put("weekday", new Dim("to_char(p.local_at, 'ID')", null, null, true));
        DIMS.put("punch", new Dim("to_char(p.local_at, 'ID-HH24')", null, null, true));
        DIMS.put("song", new Dim("CAST(s.id AS text)", "s.title", "s.artist_name", false));
        DIMS.put("artist", new Dim("s.artist_name", null, null, false));
        DIMS.put("album", new Dim("COALESCE(t.album_name, '')", null, "COALESCE(t.album_artist, t.artist_name)", false));
        DIMS.put("playlist", new Dim("COALESCE(l.external_key, '')", "l.title", null, false));
        DIMS.put("context", new Dim("COALESCE(p.context, '')", null, null, false));
        DIMS.put("device", new Dim("COALESCE(p.device, '')", null, null, false));
        DIMS.put("place", new Dim("COALESCE(p.place, '')", null, null, false));
        DIMS.put("country", new Dim("COALESCE(p.country, '')", null, null, false));
        DIMS.put("start", new Dim("COALESCE(p.reason_start, '')", null, null, false));
        DIMS.put("end", new Dim("COALESCE(p.reason_end, '')", null, null, false));
        DIMS.put("shuffle", new Dim("COALESCE(CAST(p.shuffle AS text), '')", null, null, false));
        DIMS.put("platform", new Dim("COALESCE(p.platform, '')", null, null, false));
        DIMS.put("session", new Dim("CAST(p.session_no AS text)", null, null, false));
    }
    private static final Map<String, String> BUCKETS = Map.of("year", "to_char(p.local_at, 'YYYY')", "month", "to_char(p.local_at, 'YYYY-MM')",
        "day", "to_char(p.local_at, 'YYYY-MM-DD')", "hour", "to_char(p.local_at, 'HH24')", "weekday", "to_char(p.local_at, 'ID')");
    private static final Map<String, String> SORTS = Map.of("ms", "ms DESC", "plays", "plays DESC, ms DESC", "starts", "starts DESC", "songs", "songs DESC, ms DESC",
        "days", "days DESC, ms DESC", "first", "first_at ASC", "last", "last_at DESC", "key", "k ASC");

    /** What a report is cut down to; everything is optional. from / to = yyyy, yyyy-MM or yyyy-MM-dd on his wall clock
     *  (to is not included). device, place, context, start, end, weekday take several values, comma apart. */
    public record Filter(String from, String to, UUID song, String artist, String album, String playlist, String context, String device,
                         String place, Boolean shuffle, String start, String end, Integer hourFrom, Integer hourTo, String weekday, String q) {}

    private final NamedParameterJdbcTemplate jdbc;
    private final SpotifySongRepository songs;
    private final MusicTrackRepository musicTracks;
    private final MusicService music;

    public SpotifyService(NamedParameterJdbcTemplate jdbc, SpotifySongRepository songs, MusicTrackRepository musicTracks, MusicService music) {
        this.jdbc = jdbc; this.songs = songs; this.musicTracks = musicTracks; this.music = music;
    }

    // ── reports ──────────────────────────────────────────────────────────────

    /** The streams under a filter counted by one side (group); by = also cut by time (year, month, day, hour, weekday):
     *  the series then holds each line's numbers per bucket, and each bucket's own total under no key. */
    @Transactional(readOnly = true)
    public SpotifyDto.Report report(String group, String by, Filter f, String sort, Integer limit) {
        Dim d = DIMS.get(group == null || group.isBlank() ? "year" : group);
        if (d == null) throw new IllegalArgumentException("group: one of " + DIMS.keySet());
        if (by != null && !by.isBlank() && !BUCKETS.containsKey(by)) throw new IllegalArgumentException("by: one of " + BUCKETS.keySet());
        MapSqlParameterSource p = new MapSqlParameterSource();
        String where = where(f, p);
        String order = sort != null && !sort.isBlank() ? SORTS.get(sort) : d.time() ? "k ASC" : "ms DESC";
        if (order == null) throw new IllegalArgumentException("sort: one of " + SORTS.keySet());
        int max = d.time() ? 20000 : Math.max(1, Math.min(limit == null ? 50 : limit, 2000));
        boolean song = "song".equals(group);
        String label = d.label() == null ? "NULL" : "MAX(" + d.label() + ")", sub = d.sub() == null ? "NULL" : d.sub();
        String sql = "SELECT " + d.key() + " AS k, " + label + " AS label, " + sub + " AS sub, "
            + (song ? "MAX(s.version) AS ver, MAX(m.external_key) AS track_key, " : "NULL AS ver, NULL AS track_key, ")
            + METRICS + FROM + (song ? " LEFT JOIN music_tracks m ON m.id = s.music_track_id" : "") + where + " GROUP BY " + d.key() + (d.sub() == null ? "" : ", " + d.sub()) + " ORDER BY " + order + ", k ASC LIMIT " + max;
        SpotifyDto.Report r = new SpotifyDto.Report();
        r.rows = jdbc.query(sql, p, (rs, i) -> row(rs));
        r.total = jdbc.queryForObject("SELECT " + METRICS + ", COUNT(DISTINCT s.artist_name) AS artists" + FROM + where, p, (rs, i) -> totals(rs, true));
        if (by != null && !by.isBlank()) {
            String b = BUCKETS.get(by);
            r.series = new ArrayList<>(jdbc.query("SELECT " + b + " AS b, NULL AS k, COUNT(*) FILTER (WHERE p.ms_played >= 30000) AS plays, SUM(p.ms_played) AS ms"
                + FROM + where + " GROUP BY " + b + " ORDER BY b", p, (rs, i) -> point(rs)));
            if (!d.time() && !r.rows.isEmpty()) {
                p.addValue("keys", r.rows.stream().map(x -> x.key).distinct().toList());
                r.series.addAll(jdbc.query("SELECT " + b + " AS b, " + d.key() + " AS k, COUNT(*) FILTER (WHERE p.ms_played >= 30000) AS plays, SUM(p.ms_played) AS ms"
                    + FROM + where + " AND " + d.key() + " IN (:keys) GROUP BY " + b + ", " + d.key() + " ORDER BY b", p, (rs, i) -> point(rs)));
            }
        }
        return r;
    }

    /** Everything at a glance: the whole, then each year with the song, the artist and the list he played most. */
    @Transactional(readOnly = true)
    public SpotifyDto.Overview overview() {
        MapSqlParameterSource p = new MapSqlParameterSource();
        SpotifyDto.Overview o = new SpotifyDto.Overview();
        o.total = jdbc.queryForObject("SELECT " + METRICS + ", COUNT(DISTINCT s.artist_name) AS artists" + FROM, p, (rs, i) -> totals(rs, true));
        Map<String, SpotifyDto.Year> years = new TreeMap<>();
        jdbc.query("SELECT to_char(p.local_at, 'YYYY') AS y, " + METRICS + ", COUNT(DISTINCT s.artist_name) AS artists" + FROM + " GROUP BY 1", p, rs -> {
            SpotifyDto.Year y = new SpotifyDto.Year(); y.year = rs.getString("y"); y.total = totals(rs, true); years.put(y.year, y);
        });
        String top = "SELECT * FROM (SELECT to_char(p.local_at, 'YYYY') AS y, %s AS k, %s AS label, %s AS sub, NULL AS ver, NULL AS track_key, " + METRICS
            + ", ROW_NUMBER() OVER (PARTITION BY to_char(p.local_at, 'YYYY') ORDER BY %s DESC) AS rn" + FROM + " %s GROUP BY 1, 2%s) x WHERE rn = 1";
        jdbc.query(String.format(top, "CAST(s.id AS text)", "MAX(s.title)", "MAX(s.artist_name)", "COUNT(*) FILTER (WHERE p.ms_played >= 30000)", "", ""), p,
            rs -> { SpotifyDto.Year y = years.get(rs.getString("y")); if (y != null) y.topSong = row(rs); });
        jdbc.query(String.format(top, "s.artist_name", "NULL", "NULL", "SUM(p.ms_played)", "", ""), p,
            rs -> { SpotifyDto.Year y = years.get(rs.getString("y")); if (y != null) y.topArtist = row(rs); });
        jdbc.query(String.format(top, "l.external_key", "MAX(l.title)", "NULL", "SUM(p.ms_played)", "WHERE p.playlist_id IS NOT NULL", ""), p,
            rs -> { SpotifyDto.Year y = years.get(rs.getString("y")); if (y != null) y.topPlaylist = row(rs); });
        o.years = new ArrayList<>(years.values());
        return o;
    }

    /** One song: its numbers, how he came to it (picked, passed, finished), the lists it is in, the recording in his music. */
    @Transactional(readOnly = true)
    public SpotifyDto.Song song(UUID id) {
        SpotifySong s = songs.findById(id).orElseThrow(() -> new NoSuchElementException("Song not found: " + id));
        MapSqlParameterSource p = new MapSqlParameterSource("song", id);
        SpotifyDto.Song o = new SpotifyDto.Song();
        o.id = s.getId(); o.key = s.getSongKey(); o.title = s.getTitle(); o.version = s.getVersion(); o.artist = s.getArtistName(); o.assessment = s.getAssessment();
        String where = " WHERE t.song_id = :song";
        o.total = jdbc.queryForObject("SELECT " + METRICS + ", 1 AS artists" + FROM + where, p, (rs, i) -> totals(rs, true));
        jdbc.query("SELECT COUNT(*) FILTER (WHERE p.reason_start = 'clickrow' AND p.ms_played >= 30000) AS picked, COUNT(*) FILTER (WHERE p.reason_end = 'fwdbtn') AS passed,"
            + " COUNT(*) FILTER (WHERE p.reason_end = 'trackdone') AS finished" + FROM + where, p,
            rs -> { o.picked = rs.getLong("picked"); o.passed = rs.getLong("passed"); o.finished = rs.getLong("finished"); });
        o.tracks = jdbc.query("SELECT t.spotify_id, t.name, t.album_name, (SELECT COUNT(*) FROM spotify_plays p WHERE p.track_id = t.id AND p.ms_played >= 30000) AS plays"
            + " FROM spotify_tracks t WHERE t.song_id = :song ORDER BY plays DESC, t.name", p,
            (rs, i) -> new SpotifyDto.TrackRef(rs.getString(1), rs.getString(2), rs.getString(3), rs.getLong(4)));
        MusicTrack m = s.getMusicTrack();
        if (m != null) {
            o.recording = music.track(musicTracks.findFullByIds(List.of(m.getId())).get(0), null);
            p.addValue("track", m.getId());
            o.lists = jdbc.query("SELECT l.external_key, l.title, e.added_at FROM music_playlist_entries e JOIN music_playlists l ON l.id = e.playlist_id"
                + " WHERE e.track_id = :track ORDER BY COALESCE(e.added_at, l.taken_at) NULLS LAST, l.title", p,
                (rs, i) -> new SpotifyDto.ListRef(rs.getString(1), rs.getString(2), time(rs, 3)));
        } else o.lists = List.of();
        return o;
    }

    /** The streams of one day of his (yyyy-MM-dd on his wall clock), in the order they happened. */
    @Transactional(readOnly = true)
    public List<SpotifyDto.DayPlay> day(String date) {
        LocalDateTime from = moment(date, "date");
        MapSqlParameterSource p = new MapSqlParameterSource().addValue("from", from).addValue("to", from.plusDays(1));
        return jdbc.query("SELECT p.local_at, p.ms_played, s.id AS song_id, s.title, s.version, s.artist_name, t.album_name, p.device, p.place, p.context,"
            + " l.external_key AS list_key, l.title AS list_title, p.reason_start, p.reason_end, p.shuffle" + FROM
            + " WHERE p.local_at >= :from AND p.local_at < :to ORDER BY p.local_at, p.played_at LIMIT 3000", p, (rs, i) -> {
                SpotifyDto.DayPlay o = new SpotifyDto.DayPlay();
                o.at = time(rs, 1); o.ms = rs.getInt(2); o.songId = rs.getObject(3, UUID.class); o.title = rs.getString(4); o.version = rs.getString(5);
                o.artist = rs.getString(6); o.album = rs.getString(7); o.device = rs.getString(8); o.place = rs.getString(9); o.context = rs.getString(10);
                o.playlistKey = rs.getString(11); o.playlistTitle = rs.getString(12); o.start = rs.getString(13); o.end = rs.getString(14);
                o.shuffle = (Boolean) rs.getObject(15);
                return o;
            });
    }

    private String where(Filter f, MapSqlParameterSource p) {
        List<String> w = new ArrayList<>();
        if (f == null) return "";
        if (!blank(f.from())) { w.add("p.local_at >= :from"); p.addValue("from", moment(f.from(), "from")); }
        if (!blank(f.to())) { w.add("p.local_at < :to"); p.addValue("to", moment(f.to(), "to")); }
        if (f.song() != null) { w.add("t.song_id = :song"); p.addValue("song", f.song()); }
        if (!blank(f.artist())) { w.add("s.artist_name = :artist"); p.addValue("artist", f.artist()); }
        if (!blank(f.album())) { w.add("t.album_name = :album"); p.addValue("album", f.album()); }
        if (!blank(f.playlist())) {
            if ("none".equals(f.playlist())) w.add("p.playlist_id IS NULL");
            else { w.add("l.external_key = :playlist"); p.addValue("playlist", f.playlist()); }
        }
        in(w, p, "p.context", "context", f.context());
        in(w, p, "p.device", "device", f.device());
        in(w, p, "p.place", "place", f.place());
        in(w, p, "p.reason_start", "start", f.start());
        in(w, p, "p.reason_end", "end", f.end());
        in(w, p, "to_char(p.local_at, 'ID')", "weekday", f.weekday());
        if (f.shuffle() != null) { w.add("p.shuffle = :shuffle"); p.addValue("shuffle", f.shuffle()); }
        if (f.hourFrom() != null && f.hourTo() != null) {
            String h = "CAST(EXTRACT(HOUR FROM p.local_at) AS int)";
            w.add(f.hourFrom() <= f.hourTo() ? h + " BETWEEN :hourFrom AND :hourTo" : "(" + h + " >= :hourFrom OR " + h + " <= :hourTo)");
            p.addValue("hourFrom", f.hourFrom()).addValue("hourTo", f.hourTo());
        }
        if (!blank(f.q())) {
            w.add("(LOWER(s.title) LIKE :q OR LOWER(s.artist_name) LIKE :q OR LOWER(t.album_name) LIKE :q)");
            p.addValue("q", "%" + f.q().trim().toLowerCase(Locale.ROOT) + "%");
        }
        return w.isEmpty() ? " WHERE TRUE" : " WHERE " + String.join(" AND ", w);
    }

    private static void in(List<String> w, MapSqlParameterSource p, String column, String name, String values) {
        if (blank(values)) return;
        List<String> list = Arrays.stream(values.split(",")).map(String::trim).filter(v -> !v.isEmpty()).toList();
        if (list.isEmpty()) return;
        w.add(column + " IN (:" + name + ")");
        p.addValue(name, list);
    }

    private static SpotifyDto.Row row(ResultSet rs) throws SQLException {
        SpotifyDto.Row r = new SpotifyDto.Row();
        r.key = rs.getString("k"); r.label = rs.getString("label"); r.sub = rs.getString("sub"); r.version = rs.getString("ver"); r.trackKey = rs.getString("track_key");
        r.starts = rs.getLong("starts"); r.plays = rs.getLong("plays"); r.ms = rs.getLong("ms"); r.songs = rs.getInt("songs"); r.days = rs.getInt("days");
        r.first = time(rs, "first_at"); r.last = time(rs, "last_at");
        return r;
    }

    private static SpotifyDto.Totals totals(ResultSet rs, boolean artists) throws SQLException {
        SpotifyDto.Totals t = new SpotifyDto.Totals();
        t.starts = rs.getLong("starts"); t.plays = rs.getLong("plays"); t.ms = rs.getLong("ms"); t.songs = rs.getInt("songs"); t.days = rs.getInt("days");
        t.first = time(rs, "first_at"); t.last = time(rs, "last_at");
        if (artists) t.artists = rs.getInt("artists");
        return t;
    }

    private static SpotifyDto.Point point(ResultSet rs) throws SQLException {
        SpotifyDto.Point x = new SpotifyDto.Point();
        x.bucket = rs.getString("b"); x.key = rs.getString("k"); x.plays = rs.getLong("plays"); x.ms = rs.getLong("ms");
        return x;
    }

    private static LocalDateTime time(ResultSet rs, String c) throws SQLException { Timestamp t = rs.getTimestamp(c); return t == null ? null : t.toLocalDateTime(); }
    private static LocalDateTime time(ResultSet rs, int c) throws SQLException { Timestamp t = rs.getTimestamp(c); return t == null ? null : t.toLocalDateTime(); }

    /** yyyy | yyyy-MM | yyyy-MM-dd → the start of that span. */
    static LocalDateTime moment(String v, String where) {
        try {
            String s = v.trim();
            if (s.length() == 4) return LocalDate.of(Integer.parseInt(s), 1, 1).atStartOfDay();
            if (s.length() == 7) return LocalDate.parse(s + "-01").atStartOfDay();
            return LocalDate.parse(s.substring(0, 10)).atStartOfDay();
        } catch (RuntimeException e) {
            throw new IllegalArgumentException(where + ": a date as yyyy, yyyy-MM or yyyy-MM-dd (\"" + v + "\")");
        }
    }

    // ── write ───────────────────────────────────────────────────────────────

    /** Songs and tracks matched by key / id, plays added in bulk; reset = every play is removed first. */
    public SpotifyDto.SyncResult sync(SpotifyDto.Sync in) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        List<String> warnings = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        if (Boolean.TRUE.equals(in.reset)) counts.put("playsRemoved", jdbc.update("DELETE FROM spotify_plays", new MapSqlParameterSource()));

        if (in.songs != null && !in.songs.isEmpty()) {
            Map<String, UUID> hub = ids("SELECT external_key, id FROM music_tracks");
            List<SqlParameterSource> batch = new ArrayList<>();
            for (SpotifyDto.SongIn s : in.songs) {
                if (blank(s.key) || blank(s.title) || blank(s.artist)) { warnings.add("songs: key, title and artist are required (" + s.key + ")"); continue; }
                UUID track = blank(s.trackKey) ? null : hub.get(s.trackKey.trim());
                if (!blank(s.trackKey) && track == null) warnings.add("songs[" + s.key + "].trackKey: no recording " + s.trackKey);
                batch.add(new MapSqlParameterSource().addValue("key", cut(s.key.trim(), 300)).addValue("title", cut(s.title.trim(), 400))
                    .addValue("version", blank(s.version) ? null : cut(s.version.trim(), 200)).addValue("artist", cut(s.artist.trim(), 300))
                    .addValue("setTrack", s.trackKey != null).addValue("track", track, Types.OTHER)
                    .addValue("setText", s.assessment != null).addValue("text", blank(s.assessment) ? null : s.assessment.trim()).addValue("now", now));
            }
            jdbc.batchUpdate("INSERT INTO spotify_songs (id, song_key, title, version, artist_name, music_track_id, assessment, created_at, updated_at)"
                + " VALUES (gen_random_uuid(), :key, :title, :version, :artist, :track, :text, :now, :now)"
                + " ON CONFLICT (song_key) DO UPDATE SET title = EXCLUDED.title, version = EXCLUDED.version, artist_name = EXCLUDED.artist_name,"
                + " music_track_id = CASE WHEN :setTrack THEN EXCLUDED.music_track_id ELSE spotify_songs.music_track_id END,"
                + " assessment = CASE WHEN :setText THEN EXCLUDED.assessment ELSE spotify_songs.assessment END, updated_at = EXCLUDED.updated_at",
                batch.toArray(SqlParameterSource[]::new));
            counts.put("songs", batch.size());
        }

        if (in.tracks != null && !in.tracks.isEmpty()) {
            Map<String, UUID> song = ids("SELECT song_key, id FROM spotify_songs");
            List<SqlParameterSource> batch = new ArrayList<>();
            for (SpotifyDto.TrackIn t : in.tracks) {
                UUID s = blank(t.song) ? null : song.get(t.song.trim());
                if (blank(t.id) || blank(t.name) || s == null) { warnings.add("tracks[" + t.id + "]: id, name and a known song are required (" + t.song + ")"); continue; }
                batch.add(new MapSqlParameterSource().addValue("id", cut(t.id.trim(), 40)).addValue("name", cut(t.name.trim(), 400))
                    .addValue("artist", blank(t.artist) ? "" : cut(t.artist.trim(), 300)).addValue("artists", blank(t.artists) ? null : cut(t.artists.trim(), 600))
                    .addValue("album", blank(t.album) ? null : cut(t.album.trim(), 400)).addValue("albumArtist", blank(t.albumArtist) ? null : cut(t.albumArtist.trim(), 300))
                    .addValue("duration", t.durationMs, Types.INTEGER).addValue("song", s, Types.OTHER).addValue("now", now));
            }
            jdbc.batchUpdate("INSERT INTO spotify_tracks (id, spotify_id, name, artist_name, artists, album_name, album_artist, duration_ms, song_id, created_at, updated_at)"
                + " VALUES (gen_random_uuid(), :id, :name, :artist, :artists, :album, :albumArtist, :duration, :song, :now, :now)"
                + " ON CONFLICT (spotify_id) DO UPDATE SET name = EXCLUDED.name, artist_name = EXCLUDED.artist_name, artists = EXCLUDED.artists,"
                + " album_name = EXCLUDED.album_name, album_artist = EXCLUDED.album_artist, duration_ms = EXCLUDED.duration_ms, song_id = EXCLUDED.song_id,"
                + " updated_at = EXCLUDED.updated_at", batch.toArray(SqlParameterSource[]::new));
            counts.put("tracks", batch.size());
        }

        if (in.plays != null && !in.plays.isEmpty()) {
            Map<String, UUID> track = ids("SELECT spotify_id, id FROM spotify_tracks"), list = ids("SELECT external_key, id FROM music_playlists");
            Set<String> missing = new TreeSet<>();
            List<SqlParameterSource> batch = new ArrayList<>();
            for (SpotifyDto.PlayIn x : in.plays) {
                UUID t = blank(x.track) ? null : track.get(x.track.trim());
                if (t == null || blank(x.at) || blank(x.local)) { warnings.add("plays: no track " + x.track + " or no time (" + x.at + ")"); continue; }
                UUID l = blank(x.playlist) ? null : list.get(x.playlist.trim());
                if (!blank(x.playlist) && l == null) missing.add(x.playlist.trim());
                batch.add(new MapSqlParameterSource().addValue("at", LocalDateTime.parse(x.at.trim())).addValue("local", LocalDateTime.parse(x.local.trim()))
                    .addValue("ms", x.ms).addValue("track", t, Types.OTHER).addValue("platform", blank(x.platform) ? null : cut(x.platform.trim(), 160))
                    .addValue("device", blank(x.device) ? null : cut(x.device.trim(), 16)).addValue("country", blank(x.country) ? null : cut(x.country.trim(), 4))
                    .addValue("place", blank(x.place) ? null : cut(x.place.trim(), 8)).addValue("start", blank(x.start) ? null : cut(x.start.trim(), 40))
                    .addValue("end", blank(x.end) ? null : cut(x.end.trim(), 40)).addValue("shuffle", x.shuffle, Types.BOOLEAN).addValue("skipped", x.skipped, Types.BOOLEAN)
                    .addValue("offline", x.offline, Types.BOOLEAN).addValue("incognito", x.incognito, Types.BOOLEAN).addValue("session", x.session, Types.INTEGER)
                    .addValue("context", blank(x.context) ? null : cut(x.context.trim(), 10)).addValue("list", l, Types.OTHER).addValue("now", now));
            }
            jdbc.batchUpdate("INSERT INTO spotify_plays (id, played_at, local_at, ms_played, track_id, platform, device, country, place, reason_start, reason_end,"
                + " shuffle, skipped, offline, incognito, session_no, context, playlist_id, created_at, updated_at)"
                + " VALUES (gen_random_uuid(), :at, :local, :ms, :track, :platform, :device, :country, :place, :start, :end, :shuffle, :skipped, :offline, :incognito,"
                + " :session, :context, :list, :now, :now)", batch.toArray(SqlParameterSource[]::new));
            counts.put("plays", batch.size());
            for (String k : missing) warnings.add("plays.playlist: no list " + k);
        }
        return new SpotifyDto.SyncResult(counts, warnings);
    }

    private Map<String, UUID> ids(String sql) {
        Map<String, UUID> m = new HashMap<>();
        jdbc.query(sql, new MapSqlParameterSource(), rs -> { m.put(rs.getString(1), rs.getObject(2, UUID.class)); });
        return m;
    }

    private static boolean blank(String v) { return v == null || v.isBlank(); }
    private static String cut(String v, int max) { return v.length() <= max ? v : v.substring(0, max); }
}
