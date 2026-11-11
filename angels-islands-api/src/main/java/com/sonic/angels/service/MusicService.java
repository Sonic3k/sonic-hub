package com.sonic.angels.service;

import com.sonic.angels.model.dto.EventDateDto;
import com.sonic.angels.model.dto.MediaFileDto;
import com.sonic.angels.model.dto.MusicDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import jakarta.persistence.EntityManager;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * His music: artists (with the group a solo artist came from), albums, recordings with their audio (music folder of the
 * bucket, see {@link MusicAudioService}) and links, the CDs he owns with their photos and scans, and the lists he kept
 * at moments of his life (checkpoints). Read by Sonic Hub and the admin, written by the admin and by importers (sync,
 * matched by key).
 */
@Service
@Transactional
public class MusicService {

    private static final UUID NIL = new UUID(0, 0);
    private static final Pattern KEY = Pattern.compile("[a-z0-9][a-z0-9-]{0,199}");

    private final MusicArtistRepository artists;
    private final MusicAlbumRepository albums;
    private final MusicTrackRepository tracks;
    private final MusicLinkRepository links;
    private final MusicCdRepository cds;
    private final MusicCdMediaRepository cdMedia;
    private final MusicPlaylistRepository playlists;
    private final MusicPlaylistEntryRepository entries;
    private final MusicTrackMemoryRepository trackMemories;
    private final MusicTrackEventRepository trackEvents;
    private final MediaFileRepository mediaRepo;
    private final EpisodeRepository episodeRepo;
    private final LifeEventRepository eventRepo;
    private final DeskDeviceRepository deviceRepo;
    private final StorageService storage;
    private final NamedParameterJdbcTemplate jdbc;
    private final DtoMapper mapper;
    private final EntityManager em;

    public MusicService(MusicArtistRepository artists, MusicAlbumRepository albums, MusicTrackRepository tracks, MusicLinkRepository links,
                        MusicCdRepository cds, MusicCdMediaRepository cdMedia, MusicPlaylistRepository playlists,
                        MusicPlaylistEntryRepository entries, MusicTrackMemoryRepository trackMemories, MusicTrackEventRepository trackEvents,
                        MediaFileRepository mediaRepo, EpisodeRepository episodeRepo, LifeEventRepository eventRepo,
                        DeskDeviceRepository deviceRepo, StorageService storage, NamedParameterJdbcTemplate jdbc, DtoMapper mapper,
                        EntityManager em) {
        this.artists = artists; this.albums = albums; this.tracks = tracks; this.links = links; this.cds = cds; this.cdMedia = cdMedia;
        this.playlists = playlists; this.entries = entries; this.trackMemories = trackMemories; this.trackEvents = trackEvents;
        this.mediaRepo = mediaRepo; this.episodeRepo = episodeRepo; this.eventRepo = eventRepo; this.deviceRepo = deviceRepo;
        this.storage = storage; this.jdbc = jdbc; this.mapper = mapper; this.em = em;
    }

    // ── read: artists ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MusicDto.Artist> artists() {
        List<MusicArtist> all = artists.findAllWithParent();
        Counts c = counts();
        Map<UUID, List<MusicArtist>> members = members(all);
        return all.stream().map(a -> artist(new MusicDto.Artist(), a, c, members)).sorted(BY_NAME).toList();
    }

    @Transactional(readOnly = true)
    public MusicDto.ArtistDetail artist(String key) {
        MusicArtist a = getArtist(key);
        List<MusicArtist> all = artists.findAllWithParent();
        Counts c = counts();
        MusicDto.ArtistDetail d = artist(new MusicDto.ArtistDetail(), a, c, members(all));
        d.imageMediaId = a.getImageMediaId();
        d.albumList = albums.findByArtist(a.getId()).stream().map(x -> album(new MusicDto.Album(), x, c)).sorted(ALBUM_ORDER).toList();
        Map<UUID, List<String>> member = membership();
        d.trackList = tracks.findAllFull().stream().filter(t -> t.getArtist() != null && t.getArtist().getId().equals(a.getId()))
            .map(t -> track(t, member)).sorted(TRACK_ORDER).toList();
        return d;
    }

    private static final Comparator<MusicDto.Artist> BY_NAME = Comparator.comparing((MusicDto.Artist a) -> a.name, String.CASE_INSENSITIVE_ORDER);

    private <T extends MusicDto.Artist> T artist(T o, MusicArtist a, Counts c, Map<UUID, List<MusicArtist>> members) {
        o.id = a.getId(); o.key = a.getExternalKey(); o.name = a.getName(); o.kind = a.getKind() == null ? null : a.getKind().name();
        o.country = a.getCountry(); o.summary = a.getSummary(); o.note = a.getNote(); o.favorite = a.getFavorite();
        o.parent = ref(a.getParent());
        o.tracks = c.tracksByArtist().getOrDefault(a.getId(), 0);
        o.albums = c.albumsByArtist().getOrDefault(a.getId(), 0);
        o.members = members.getOrDefault(a.getId(), List.of()).stream().map(MusicService::ref)
            .sorted(Comparator.comparing(MusicDto.ArtistRef::name, String.CASE_INSENSITIVE_ORDER)).toList();
        return o;
    }

    private static Map<UUID, List<MusicArtist>> members(List<MusicArtist> all) {
        return all.stream().filter(a -> a.getParent() != null).collect(Collectors.groupingBy(a -> a.getParent().getId()));
    }

    // ── read: albums ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MusicDto.Album> albums() {
        Counts c = counts();
        return albums.findAllWithArtist().stream().map(x -> album(new MusicDto.Album(), x, c)).sorted(ALBUM_ORDER).toList();
    }

    @Transactional(readOnly = true)
    public MusicDto.AlbumDetail album(String key) {
        MusicAlbum a = getAlbum(key);
        MusicDto.AlbumDetail d = album(new MusicDto.AlbumDetail(), a, counts());
        d.coverMediaId = a.getCoverMediaId();
        Map<UUID, List<String>> member = membership();
        d.trackList = tracks.findAllFull().stream().filter(t -> t.getAlbum() != null && t.getAlbum().getId().equals(a.getId()))
            .map(t -> track(t, member))
            .sorted(Comparator.comparing((MusicDto.Track t) -> t.trackNo, Comparator.nullsLast(Comparator.naturalOrder())).thenComparing(TRACK_ORDER))
            .toList();
        List<MusicCd> mine = cds.findByAlbum(a.getId());
        Map<UUID, List<MusicCdMedia>> media = cdMediaOf(mine);
        d.cdList = mine.stream().map(x -> cd(x, media)).sorted(Comparator.comparing((MusicDto.Cd x) -> x.title, String.CASE_INSENSITIVE_ORDER)).toList();
        return d;
    }

    private static final Comparator<MusicDto.Album> ALBUM_ORDER = Comparator
        .comparing((MusicDto.Album a) -> a.artist == null ? "~" : a.artist.name(), String.CASE_INSENSITIVE_ORDER)
        .thenComparing(a -> a.releaseYear, Comparator.nullsLast(Comparator.naturalOrder()))
        .thenComparing(a -> a.title, String.CASE_INSENSITIVE_ORDER);

    private <T extends MusicDto.Album> T album(T o, MusicAlbum a, Counts c) {
        o.id = a.getId(); o.key = a.getExternalKey(); o.title = a.getTitle(); o.kind = a.getKind() == null ? null : a.getKind().name();
        o.summary = a.getSummary(); o.note = a.getNote(); o.releaseYear = a.getReleaseYear(); o.favorite = a.getFavorite();
        o.artist = ref(a.getArtist());
        o.tracks = c.tracksByAlbum().getOrDefault(a.getId(), 0);
        o.cds = c.cdsByAlbum().getOrDefault(a.getId(), 0);
        if (a.getCoverMediaId() != null) o.coverUrl = mediaRepo.findById(a.getCoverMediaId()).map(mapper::imageUrl).orElse(null);
        return o;
    }

    // ── read: tracks ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MusicDto.Track> tracks() {
        Map<UUID, List<String>> member = membership();
        return tracks.findAllFull().stream().map(t -> track(t, member)).sorted(TRACK_ORDER).toList();
    }

    @Transactional(readOnly = true)
    public MusicDto.TrackDetail track(String key) {
        MusicTrack t = getTrack(key);
        Map<UUID, List<String>> member = membership();
        MusicDto.TrackDetail d = new MusicDto.TrackDetail();
        fillTrack(d, t, member);
        d.summary = t.getSummary(); d.note = t.getNote();
        d.audioFileName = t.getAudioFileName(); d.audioMime = t.getAudioMime(); d.audioSourcePath = t.getAudioSourcePath();
        d.audioSize = t.getAudioSize(); d.audioBitrate = t.getAudioBitrate();
        d.links = links.findByTrackIdOrderBySortOrderAsc(t.getId()).stream().map(MusicService::link).toList();
        d.memories = trackMemories.findByTrack(t.getId()).stream().map(this::memory)
            .sorted(Comparator.comparing((MusicDto.MemoryLink m) -> m.occurredAt, Comparator.nullsLast(Comparator.naturalOrder()))).toList();
        d.events = trackEvents.findByTrack(t.getId()).stream().map(MusicService::event)
            .sorted(Comparator.comparing((MusicDto.EventLink m) -> m.startAt, Comparator.nullsLast(Comparator.naturalOrder()))).toList();
        d.inPlaylists = entries.findByTrack(t.getId()).stream().map(MusicPlaylistEntry::getPlaylist).sorted(PLAYLIST_ORDER)
            .map(p -> new MusicDto.PlaylistRef(p.getExternalKey(), p.getTitle(), p.getKind().name(), when(p))).toList();
        MusicTrack root = t.getVersionOf() != null ? t.getVersionOf() : t;
        List<MusicTrack> family = new ArrayList<>(tracks.findByVersionOfId(root.getId()));
        family.add(root);
        List<UUID> ids = family.stream().map(MusicTrack::getId).filter(id -> !id.equals(t.getId())).distinct().toList();
        d.versions = ids.isEmpty() ? List.of() : tracks.findFullByIds(ids).stream().map(x -> track(x, member)).sorted(TRACK_ORDER).toList();
        return d;
    }

    private static final Comparator<MusicDto.Track> TRACK_ORDER = Comparator
        .comparing((MusicDto.Track t) -> t.artist == null ? "~" : t.artist.name(), String.CASE_INSENSITIVE_ORDER)
        .thenComparing(t -> t.title, String.CASE_INSENSITIVE_ORDER)
        .thenComparing(t -> t.version == null ? "" : t.version, String.CASE_INSENSITIVE_ORDER);

    MusicDto.Track track(MusicTrack t, Map<UUID, List<String>> member) {
        MusicDto.Track o = new MusicDto.Track();
        fillTrack(o, t, member);
        return o;
    }

    private void fillTrack(MusicDto.Track o, MusicTrack t, Map<UUID, List<String>> member) {
        o.id = t.getId(); o.key = t.getExternalKey(); o.title = t.getTitle(); o.version = t.getVersion(); o.featuring = t.getFeaturing();
        o.language = t.getLanguage(); o.genre = t.getGenre();
        o.artist = ref(t.getArtist()); o.album = ref(t.getAlbum());
        o.favorite = t.getFavorite(); o.releaseYear = t.getReleaseYear(); o.durationSec = t.getDurationSec(); o.trackNo = t.getTrackNo();
        o.firstHeardAt = t.getFirstHeardAt();
        o.firstHeardPrecision = t.getFirstHeardPrecision() == null ? null : t.getFirstHeardPrecision().name();
        o.firstHeardApprox = Boolean.TRUE.equals(t.getFirstHeardApprox());
        o.firstHeardEvidence = t.getFirstHeardEvidence();
        o.firstHeard = LifeEventService.whenText(t.getFirstHeardAt(), t.getFirstHeardPrecision(), o.firstHeardApprox, null);
        o.hasAudio = t.getAudioStorageKey() != null;
        o.audioUrl = o.hasAudio ? audioPath(t) : null;
        o.versionOfKey = t.getVersionOf() == null ? null : t.getVersionOf().getExternalKey();
        o.playlists = member == null ? List.of() : member.getOrDefault(t.getId(), List.of());
    }

    /** Where its file plays from (relative to the API); the hash in it changes when the file does. */
    static String audioPath(MusicTrack t) {
        String h = t.getAudioHash();
        return "/api/music/tracks/" + t.getExternalKey() + "/audio" + (h == null || h.length() < 8 ? "" : "?v=" + h.substring(0, 8));
    }

    private static MusicDto.Link link(MusicLink l) {
        MusicDto.Link o = new MusicDto.Link();
        o.id = l.getId(); o.kind = l.getKind().name(); o.title = l.getTitle(); o.url = l.getUrl(); o.note = l.getNote();
        return o;
    }

    private MusicDto.MemoryLink memory(MusicTrackMemory x) {
        Episode e = x.getEpisode();
        MusicDto.MemoryLink m = new MusicDto.MemoryLink();
        m.id = e.getId(); m.title = e.getTitle(); m.summary = e.getSummary(); m.when = e.whenText(); m.kind = e.getKind();
        m.occurredAt = e.getOccurredAt(); m.role = x.getRole().name(); m.note = x.getNote();
        m.coverUrl = e.getMediaFiles().stream().filter(Objects::nonNull).filter(f -> f.getFileType() == MediaFile.FileType.IMAGE)
            .map(mapper::imageUrl).filter(Objects::nonNull).findFirst().orElse(null);
        return m;
    }

    private static MusicDto.EventLink event(MusicTrackEvent x) {
        LifeEvent e = x.getEvent();
        MusicDto.EventLink m = new MusicDto.EventLink();
        m.id = e.getId(); m.title = e.getTitle(); m.kind = e.getKind(); m.startAt = e.getStartAt();
        m.when = LifeEventService.whenText(e.getStartAt(), e.getPrecision(), Boolean.TRUE.equals(e.getApprox()), e.getEndAt());
        m.role = x.getRole().name(); m.note = x.getNote();
        return m;
    }

    // ── read: CDs ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MusicDto.Cd> cds() {
        List<MusicCd> all = cds.findAllWithAlbum();
        Map<UUID, List<MusicCdMedia>> media = cdMediaOf(all);
        return all.stream().map(x -> cd(x, media))
            .sorted(Comparator.comparing((MusicDto.Cd x) -> x.artist == null ? "~" : x.artist.name(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(x -> x.title, String.CASE_INSENSITIVE_ORDER))
            .toList();
    }

    @Transactional(readOnly = true)
    public MusicDto.Cd cd(String key) {
        MusicCd c = getCd(key);
        return cd(c, cdMediaOf(List.of(c)));
    }

    private Map<UUID, List<MusicCdMedia>> cdMediaOf(List<MusicCd> list) {
        if (list.isEmpty()) return Map.of();
        return cdMedia.findByCds(list.stream().map(MusicCd::getId).toList()).stream()
            .collect(Collectors.groupingBy(m -> m.getCd().getId(), LinkedHashMap::new, Collectors.toList()));
    }

    private MusicDto.Cd cd(MusicCd c, Map<UUID, List<MusicCdMedia>> media) {
        MusicDto.Cd o = new MusicDto.Cd();
        o.id = c.getId(); o.key = c.getExternalKey(); o.title = c.getTitle(); o.edition = c.getEdition(); o.format = c.getFormat();
        o.discs = c.getDiscs(); o.acquiredAt = c.getAcquiredAt(); o.acquiredVia = c.getAcquiredVia(); o.sourceFolder = c.getSourceFolder();
        o.note = c.getNote();
        o.acquired = LifeEventService.whenText(c.getAcquiredAt(), c.getAcquiredPrecision(), Boolean.TRUE.equals(c.getAcquiredApprox()), null);
        o.album = ref(c.getAlbum());
        o.artist = c.getAlbum() == null ? null : ref(c.getAlbum().getArtist());
        o.media = media.getOrDefault(c.getId(), List.of()).stream().map(m -> {
            MusicDto.CdMedia x = new MusicDto.CdMedia();
            x.linkId = m.getId(); x.role = m.getRole().name(); x.label = m.getLabel();
            x.media = mapper.toMediaFileResponse(m.getMedia(), MediaFileDto.Includes.none());
            return x;
        }).toList();
        return o;
    }

    // ── read: lists ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MusicDto.Playlist> playlists() {
        Map<UUID, int[]> n = entryCounts();
        return playlists.findAllWithRefs().stream().sorted(PLAYLIST_ORDER).map(p -> playlist(new MusicDto.Playlist(), p, n)).toList();
    }

    @Transactional(readOnly = true)
    public MusicDto.PlaylistDetail playlist(String key) {
        MusicPlaylist p = getPlaylist(key);
        MusicDto.PlaylistDetail d = playlist(new MusicDto.PlaylistDetail(), p, entryCounts());
        List<MusicPlaylistEntry> es = entries.findByPlaylists(List.of(p.getId()));
        Map<UUID, MusicTrack> full = tracks.findFullByIds(es.stream().map(e -> e.getTrack().getId()).distinct().toList()).stream()
            .collect(Collectors.toMap(MusicTrack::getId, t -> t));
        Map<UUID, List<String>> member = membership();
        d.entries = es.stream().map(e -> {
            MusicDto.Entry o = new MusicDto.Entry();
            o.position = e.getPosition(); o.fileName = e.getFileName(); o.note = e.getNote(); o.fileModifiedAt = e.getFileModifiedAt();
            o.addedAt = e.getAddedAt();
            MusicTrack t = full.get(e.getTrack().getId());
            o.track = t == null ? null : track(t, member);
            return o;
        }).toList();
        return d;
    }

    /** The lists in the order of his life: by the moment they were kept. */
    private static final Comparator<MusicPlaylist> PLAYLIST_ORDER = Comparator
        .comparing(MusicPlaylist::getTakenAt, Comparator.nullsLast(Comparator.naturalOrder()))
        .thenComparing(MusicPlaylist::getSortOrder, Comparator.nullsLast(Comparator.naturalOrder()))
        .thenComparing(MusicPlaylist::getTitle, String.CASE_INSENSITIVE_ORDER);

    private <T extends MusicDto.Playlist> T playlist(T o, MusicPlaylist p, Map<UUID, int[]> n) {
        o.id = p.getId(); o.key = p.getExternalKey(); o.title = p.getTitle(); o.kind = p.getKind().name();
        o.takenAt = p.getTakenAt(); o.takenEnd = p.takenEnd(); o.windowFrom = p.getWindowFrom(); o.when = when(p);
        o.sourceFolder = p.getSourceFolder(); o.summary = p.getSummary(); o.note = p.getNote(); o.sortOrder = p.getSortOrder();
        o.spotifyId = p.getSpotifyId();
        if (p.getDevice() != null) { o.deviceKey = p.getDevice().getExternalKey(); o.deviceName = p.getDevice().getName(); }
        if (p.getEvent() != null) { o.eventId = p.getEvent().getId(); o.eventTitle = p.getEvent().getTitle(); }
        int[] c = n.getOrDefault(p.getId(), new int[2]);
        o.tracks = c[0]; o.withAudio = c[1];
        return o;
    }

    /** "2015-07-31"; a WINDOW list: "2005 → 2008". */
    static String when(MusicPlaylist p) {
        String at = LifeEventService.whenText(p.getTakenAt(), p.getTakenPrecision(), Boolean.TRUE.equals(p.getTakenApprox()), null);
        if (p.getKind() != MusicPlaylist.Kind.WINDOW || p.getWindowFrom() == null || at == null) return at;
        String from = LifeEventService.whenText(p.getWindowFrom(), p.getTakenPrecision(), false, null);
        return from.equals(at) ? at : from + " → " + at;
    }

    /** The music of a moment: the WINDOW lists that cover it, the last FULL list kept by then, and their songs that play. */
    @Transactional(readOnly = true)
    public MusicDto.Moment at(LocalDateTime t) {
        List<MusicPlaylist> all = playlists.findAllWithRefs();
        Map<UUID, int[]> n = entryCounts();
        List<MusicPlaylist> windows = all.stream().filter(p -> p.getKind() == MusicPlaylist.Kind.WINDOW && p.getTakenAt() != null
            && (p.getWindowFrom() == null || !p.getWindowFrom().isAfter(t)) && p.takenEnd().isAfter(t)).sorted(PLAYLIST_ORDER).toList();
        MusicPlaylist full = all.stream().filter(p -> p.getKind() == MusicPlaylist.Kind.FULL && p.getTakenAt() != null && !p.getTakenAt().isAfter(t))
            .max(Comparator.comparing(MusicPlaylist::getTakenAt)).orElse(null);
        MusicDto.Moment m = new MusicDto.Moment();
        m.at = t;
        m.windows = windows.stream().map(p -> playlist(new MusicDto.Playlist(), p, n)).toList();
        m.full = full == null ? null : playlist(new MusicDto.Playlist(), full, n);
        List<UUID> ids = new ArrayList<>(windows.stream().map(MusicPlaylist::getId).toList());
        if (full != null) ids.add(full.getId());
        Set<UUID> trackIds = ids.isEmpty() ? Set.of() : entries.findByPlaylists(ids).stream().map(e -> e.getTrack().getId())
            .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<UUID, List<String>> member = membership();
        m.tracks = trackIds.isEmpty() ? List.of() : tracks.findFullByIds(trackIds).stream().filter(x -> x.getAudioStorageKey() != null)
            .map(x -> track(x, member)).sorted(TRACK_ORDER).toList();
        return m;
    }

    // ── read: helpers ────────────────────────────────────────────────────────

    private record Counts(Map<UUID, Integer> tracksByArtist, Map<UUID, Integer> albumsByArtist, Map<UUID, Integer> tracksByAlbum,
                          Map<UUID, Integer> cdsByAlbum) {}

    private Counts counts() {
        return new Counts(
            group("SELECT artist_id AS k, COUNT(*) AS n FROM music_tracks WHERE artist_id IS NOT NULL GROUP BY artist_id"),
            group("SELECT artist_id AS k, COUNT(*) AS n FROM music_albums WHERE artist_id IS NOT NULL GROUP BY artist_id"),
            group("SELECT album_id AS k, COUNT(*) AS n FROM music_tracks WHERE album_id IS NOT NULL GROUP BY album_id"),
            group("SELECT album_id AS k, COUNT(*) AS n FROM music_cds WHERE album_id IS NOT NULL GROUP BY album_id"));
    }

    private Map<UUID, Integer> group(String sql) {
        Map<UUID, Integer> m = new HashMap<>();
        jdbc.query(sql, new MapSqlParameterSource(), rs -> { m.put(rs.getObject("k", UUID.class), rs.getInt("n")); });
        return m;
    }

    /** per list: [songs, songs with a file] */
    private Map<UUID, int[]> entryCounts() {
        Map<UUID, int[]> m = new HashMap<>();
        jdbc.query("SELECT e.playlist_id AS k, COUNT(*) AS n, COUNT(t.audio_storage_key) AS a FROM music_playlist_entries e "
                + "JOIN music_tracks t ON t.id = e.track_id GROUP BY e.playlist_id", new MapSqlParameterSource(),
            rs -> { m.put(rs.getObject("k", UUID.class), new int[]{rs.getInt("n"), rs.getInt("a")}); });
        return m;
    }

    /** per recording: the keys of the lists it is in, in the order of his life */
    private Map<UUID, List<String>> membership() {
        Map<UUID, List<String>> m = new HashMap<>();
        jdbc.query("SELECT e.track_id AS t, p.external_key AS k FROM music_playlist_entries e JOIN music_playlists p ON p.id = e.playlist_id "
                + "ORDER BY p.taken_at NULLS LAST, p.sort_order NULLS LAST, p.title", new MapSqlParameterSource(),
            rs -> { m.computeIfAbsent(rs.getObject("t", UUID.class), x -> new ArrayList<>()).add(rs.getString("k")); });
        return m;
    }

    private static MusicDto.ArtistRef ref(MusicArtist a) { return a == null ? null : new MusicDto.ArtistRef(a.getExternalKey(), a.getName(), a.getCountry()); }
    private static MusicDto.AlbumRef ref(MusicAlbum a) { return a == null ? null : new MusicDto.AlbumRef(a.getExternalKey(), a.getTitle(), a.getReleaseYear()); }

    // ── write ───────────────────────────────────────────────────────────────

    /** What a sync has written so far and can point at, read once. */
    private final class Book {
        final Map<String, MusicArtist> artistsByKey = new HashMap<>();
        final Map<String, MusicAlbum> albumsByKey = new HashMap<>();
        final Map<String, MusicTrack> tracksByKey = new HashMap<>();
        final Map<String, DeskDevice> devices = new HashMap<>();
        boolean loadedArtists, loadedAlbums, loadedTracks;

        MusicArtist artist(String k) {
            if (!loadedArtists) { artists.findAll().forEach(a -> artistsByKey.putIfAbsent(a.getExternalKey(), a)); loadedArtists = true; }
            return artistsByKey.get(k);
        }
        MusicAlbum album(String k) {
            if (!loadedAlbums) { albums.findAll().forEach(a -> albumsByKey.putIfAbsent(a.getExternalKey(), a)); loadedAlbums = true; }
            return albumsByKey.get(k);
        }
        MusicTrack track(String k) {
            if (!loadedTracks) { tracks.findAll().forEach(a -> tracksByKey.putIfAbsent(a.getExternalKey(), a)); loadedTracks = true; }
            return tracksByKey.get(k);
        }
        DeskDevice device(String k) { return devices.computeIfAbsent(k, x -> deviceRepo.findByExternalKey(x).orElse(null)); }
    }

    /** Artists, albums, recordings, CDs and lists written at once, matched by key (what is not named stays as it is). */
    public MusicDto.SyncResult sync(MusicDto.Sync in) {
        Map<String, Map<String, Integer>> counts = new LinkedHashMap<>();
        List<String> warnings = new ArrayList<>();
        Function<String, Map<String, Integer>> c = k -> counts.computeIfAbsent(k, x -> new LinkedHashMap<>());
        String source = blank(in.source) ? null : cut(in.source.trim(), 40);
        if (in.delete != null) deletes(in.delete, c);
        Book book = new Book();

        // artists: fields first, then the group each came from (it may be written in the same sync)
        for (MusicDto.ArtistIn a : nn(in.artists)) {
            String k = key(a.key, "artists.key");
            MusicArtist x = book.artist(k);
            boolean created = x == null;
            if (created) {
                if (blank(a.name)) throw new IllegalArgumentException("artists[" + k + "]: name is required");
                x = new MusicArtist(); x.setExternalKey(k); x.setSource(source);
            }
            applyArtist(x, a);
            book.artistsByKey.put(k, artists.save(x));
            c.apply("artists").merge(created ? "created" : "updated", 1, Integer::sum);
        }
        for (MusicDto.ArtistIn a : nn(in.artists)) {
            if (a.parentKey == null) continue;
            MusicArtist x = book.artist(a.key.trim());
            if (a.parentKey.isBlank()) { x.setParent(null); continue; }
            MusicArtist p = book.artist(a.parentKey.trim());
            if (p == null) warnings.add("artists[" + x.getExternalKey() + "].parentKey: no artist " + a.parentKey);
            else if (p.getId().equals(x.getId())) warnings.add("artists[" + x.getExternalKey() + "]: an artist cannot come from itself");
            else x.setParent(p);
        }

        for (MusicDto.AlbumIn a : nn(in.albums)) {
            String k = key(a.key, "albums.key");
            MusicAlbum x = book.album(k);
            boolean created = x == null;
            if (created) {
                if (blank(a.title)) throw new IllegalArgumentException("albums[" + k + "]: title is required");
                x = new MusicAlbum(); x.setExternalKey(k); x.setSource(source);
            }
            applyAlbum(x, a, book, warnings);
            book.albumsByKey.put(k, albums.save(x));
            c.apply("albums").merge(created ? "created" : "updated", 1, Integer::sum);
        }

        // recordings: fields first, then the recording each is a version of and the lists
        for (MusicDto.TrackIn t : nn(in.tracks)) {
            String k = key(t.key, "tracks.key");
            MusicTrack x = book.track(k);
            boolean created = x == null;
            if (created) {
                if (blank(t.title)) throw new IllegalArgumentException("tracks[" + k + "]: title is required");
                x = new MusicTrack(); x.setExternalKey(k); x.setSource(source);
            }
            applyTrack(x, t, book, warnings);
            book.tracksByKey.put(k, tracks.save(x));
            c.apply("tracks").merge(created ? "created" : "updated", 1, Integer::sum);
        }
        em.flush();
        for (MusicDto.TrackIn t : nn(in.tracks)) {
            MusicTrack x = book.track(t.key.trim());
            if (t.versionOfKey != null) {
                if (t.versionOfKey.isBlank()) x.setVersionOf(null);
                else {
                    MusicTrack v = book.track(t.versionOfKey.trim());
                    if (v == null) warnings.add("tracks[" + x.getExternalKey() + "].versionOfKey: no recording " + t.versionOfKey);
                    else if (v.getId().equals(x.getId())) warnings.add("tracks[" + x.getExternalKey() + "]: a recording cannot be a version of itself");
                    else x.setVersionOf(v.getVersionOf() != null ? v.getVersionOf() : v);
                }
            }
            trackLists(x, t, warnings, c);
        }

        for (MusicDto.CdIn d : nn(in.cds)) {
            String k = key(d.key, "cds.key");
            MusicCd x = cds.findByExternalKey(k).orElse(null);
            boolean created = x == null;
            if (created) {
                if (blank(d.title)) throw new IllegalArgumentException("cds[" + k + "]: title is required");
                x = new MusicCd(); x.setExternalKey(k); x.setSource(source);
            }
            applyCd(x, d, book, warnings);
            x = cds.save(x);
            if (d.media != null) cdMediaList(x, d.media, warnings, c);
            c.apply("cds").merge(created ? "created" : "updated", 1, Integer::sum);
        }

        for (MusicDto.PlaylistIn p : nn(in.playlists)) {
            String k = key(p.key, "playlists.key");
            MusicPlaylist x = playlists.findByExternalKey(k).orElse(null);
            boolean created = x == null;
            if (created) {
                if (blank(p.title)) throw new IllegalArgumentException("playlists[" + k + "]: title is required");
                x = new MusicPlaylist(); x.setExternalKey(k); x.setSource(source);
            }
            applyPlaylist(x, p, book, warnings);
            x = playlists.save(x);
            if (p.entries != null) entryList(x, p.entries, book, warnings, c);
            c.apply("playlists").merge(created ? "created" : "updated", 1, Integer::sum);
        }
        return new MusicDto.SyncResult(counts, warnings);
    }

    // ── write: one at a time (the admin) ─────────────────────────────────────

    public MusicDto.ArtistDetail putArtist(String key, MusicDto.ArtistIn in) {
        in.key = key;
        MusicDto.Sync s = new MusicDto.Sync(); s.artists = List.of(in);
        check(sync(s));
        em.flush();
        return artist(key);
    }

    public MusicDto.AlbumDetail putAlbum(String key, MusicDto.AlbumIn in) {
        in.key = key;
        MusicDto.Sync s = new MusicDto.Sync(); s.albums = List.of(in);
        check(sync(s));
        em.flush();
        return album(key);
    }

    public MusicDto.TrackDetail putTrack(String key, MusicDto.TrackIn in) {
        in.key = key;
        MusicDto.Sync s = new MusicDto.Sync(); s.tracks = List.of(in);
        check(sync(s));
        em.flush();
        return track(key);
    }

    public MusicDto.Cd putCd(String key, MusicDto.CdIn in) {
        in.key = key;
        MusicDto.Sync s = new MusicDto.Sync(); s.cds = List.of(in);
        check(sync(s));
        em.flush();
        return cd(key);
    }

    public MusicDto.PlaylistDetail putPlaylist(String key, MusicDto.PlaylistIn in) {
        in.key = key;
        MusicDto.Sync s = new MusicDto.Sync(); s.playlists = List.of(in);
        check(sync(s));
        em.flush();
        return playlist(key);
    }

    public void deleteArtist(String key) { artists.delete(getArtist(key)); }
    public void deleteAlbum(String key) { albums.delete(getAlbum(key)); }
    public void deleteTrack(String key) { deleteTrack(getTrack(key)); }
    public void deleteCd(String key) { cds.delete(getCd(key)); }
    public void deletePlaylist(String key) { playlists.delete(getPlaylist(key)); }

    private static void check(MusicDto.SyncResult r) {
        if (!r.warnings().isEmpty()) throw new IllegalArgumentException(String.join("; ", r.warnings()));
    }

    private void deletes(MusicDto.Delete d, Function<String, Map<String, Integer>> c) {
        for (String k : nn(d.playlists)) playlists.findByExternalKey(k).ifPresent(x -> { playlists.delete(x); c.apply("playlists").merge("deleted", 1, Integer::sum); });
        for (String k : nn(d.cds)) cds.findByExternalKey(k).ifPresent(x -> { cds.delete(x); c.apply("cds").merge("deleted", 1, Integer::sum); });
        for (String k : nn(d.tracks)) tracks.findByExternalKey(k).ifPresent(x -> { deleteTrack(x); c.apply("tracks").merge("deleted", 1, Integer::sum); });
        for (String k : nn(d.albums)) albums.findByExternalKey(k).ifPresent(x -> { albums.delete(x); c.apply("albums").merge("deleted", 1, Integer::sum); });
        for (String k : nn(d.artists)) artists.findByExternalKey(k).ifPresent(x -> { artists.delete(x); c.apply("artists").merge("deleted", 1, Integer::sum); });
        em.flush();
    }

    private void deleteTrack(MusicTrack t) {
        String file = t.getAudioStorageKey();
        tracks.delete(t);
        em.flush();
        try { storage.deleteMusicFile(file); } catch (RuntimeException ignored) { /* the row is gone; a stray file costs nothing */ }
    }

    private void applyArtist(MusicArtist x, MusicDto.ArtistIn a) {
        String w = "artists[" + x.getExternalKey() + "]";
        if (!blank(a.name)) x.setName(cut(a.name.trim(), 300));
        if (a.kind != null) x.setKind(a.kind.isBlank() ? null : enumOf(MusicArtist.Kind.class, a.kind, w + ".kind"));
        if (a.country != null) x.setCountry(a.country.isBlank() ? null : cut(a.country.trim().toUpperCase(Locale.ROOT), 8));
        if (a.favorite != null) x.setFavorite(favorite(a.favorite, w));
        if (a.summary != null) x.setSummary(a.summary.isBlank() ? null : a.summary.trim());
        if (a.note != null) x.setNote(a.note.isBlank() ? null : a.note.trim());
        if (a.imageMediaId != null) x.setImageMediaId(NIL.equals(a.imageMediaId) ? null : a.imageMediaId);
    }

    private void applyAlbum(MusicAlbum x, MusicDto.AlbumIn a, Book book, List<String> warnings) {
        String w = "albums[" + x.getExternalKey() + "]";
        if (!blank(a.title)) x.setTitle(cut(a.title.trim(), 300));
        if (a.artistKey != null) {
            if (a.artistKey.isBlank()) x.setArtist(null);
            else {
                MusicArtist ar = book.artist(a.artistKey.trim());
                if (ar == null) warnings.add(w + ".artistKey: no artist " + a.artistKey);
                else x.setArtist(ar);
            }
        }
        if (a.kind != null) x.setKind(a.kind.isBlank() ? null : enumOf(MusicAlbum.Kind.class, a.kind, w + ".kind"));
        if (a.releaseYear != null) x.setReleaseYear(a.releaseYear > 0 ? a.releaseYear : null);
        if (a.favorite != null) x.setFavorite(favorite(a.favorite, w));
        if (a.coverMediaId != null) x.setCoverMediaId(NIL.equals(a.coverMediaId) ? null : a.coverMediaId);
        if (a.summary != null) x.setSummary(a.summary.isBlank() ? null : a.summary.trim());
        if (a.note != null) x.setNote(a.note.isBlank() ? null : a.note.trim());
    }

    private void applyTrack(MusicTrack x, MusicDto.TrackIn t, Book book, List<String> warnings) {
        String w = "tracks[" + x.getExternalKey() + "]";
        if (!blank(t.title)) x.setTitle(cut(t.title.trim(), 300));
        if (t.version != null) x.setVersion(text(t.version, 200));
        if (t.artistKey != null) {
            if (t.artistKey.isBlank()) x.setArtist(null);
            else {
                MusicArtist a = book.artist(t.artistKey.trim());
                if (a == null) warnings.add(w + ".artistKey: no artist " + t.artistKey);
                else x.setArtist(a);
            }
        }
        if (t.featuring != null) x.setFeaturing(text(t.featuring, 300));
        if (t.albumKey != null) {
            if (t.albumKey.isBlank()) x.setAlbum(null);
            else {
                MusicAlbum a = book.album(t.albumKey.trim());
                if (a == null) warnings.add(w + ".albumKey: no album " + t.albumKey);
                else x.setAlbum(a);
            }
        }
        if (t.trackNo != null) x.setTrackNo(t.trackNo > 0 ? t.trackNo : null);
        if (t.releaseYear != null) x.setReleaseYear(t.releaseYear > 0 ? t.releaseYear : null);
        if (t.durationSec != null) x.setDurationSec(t.durationSec > 0 ? t.durationSec : null);
        if (t.language != null) x.setLanguage(t.language.isBlank() ? null : cut(t.language.trim().toLowerCase(Locale.ROOT), 8));
        if (t.genre != null) x.setGenre(text(t.genre, 120));
        if (t.favorite != null) x.setFavorite(favorite(t.favorite, w));
        if (t.firstHeard != null) {
            if (t.firstHeard.isBlank()) {
                x.setFirstHeardAt(null); x.setFirstHeardPrecision(null); x.setFirstHeardApprox(null);
            } else {
                Dated d = dated(t.firstHeard, t.firstHeardPrecision, w + ".firstHeard");
                x.setFirstHeardAt(d.at()); x.setFirstHeardPrecision(d.precision());
            }
        }
        if (t.firstHeardApprox != null) x.setFirstHeardApprox(t.firstHeardApprox ? Boolean.TRUE : null);
        if (t.firstHeardEvidence != null) x.setFirstHeardEvidence(text(t.firstHeardEvidence, 2000));
        if (t.summary != null) x.setSummary(t.summary.isBlank() ? null : t.summary.trim());
        if (t.note != null) x.setNote(t.note.isBlank() ? null : t.note.trim());
    }

    /** The lists of a recording that were given, each replacing what it covers. */
    private void trackLists(MusicTrack x, MusicDto.TrackIn t, List<String> warnings, Function<String, Map<String, Integer>> c) {
        String w = "tracks[" + x.getExternalKey() + "]";
        if (t.links != null) {
            links.deleteAll(links.findByTrackIdOrderBySortOrderAsc(x.getId()));
            em.flush();
            int i = 0;
            for (MusicDto.LinkIn l : t.links) {
                if (l == null || blank(l.url)) { warnings.add(w + ".links[" + i + "]: url is required"); i++; continue; }
                MusicLink y = new MusicLink();
                y.setTrack(x);
                y.setKind(blank(l.kind) ? MusicLink.Kind.OTHER : enumOf(MusicLink.Kind.class, l.kind, w + ".links[" + i + "].kind"));
                y.setTitle(text(l.title, 300)); y.setUrl(cut(l.url.trim(), 1000)); y.setNote(text(l.note, 1000));
                y.setSortOrder(i++);
                links.save(y);
            }
            c.apply("links").merge("written", t.links.size(), Integer::sum);
        }
        if (t.memories != null) {
            trackMemories.deleteAll(trackMemories.findByTrackId(x.getId()));
            em.flush();
            List<UUID> ids = t.memories.stream().filter(Objects::nonNull).map(m -> m.id).filter(Objects::nonNull).distinct().toList();
            Map<UUID, Episode> eps = episodeRepo.findAllById(ids).stream().collect(Collectors.toMap(Episode::getId, e -> e));
            Set<UUID> seen = new HashSet<>();
            int i = 0;
            for (MusicDto.TieIn m : t.memories) {
                Episode e = m == null || m.id == null ? null : eps.get(m.id);
                if (e == null) { warnings.add(w + ".memories: no memory " + (m == null ? null : m.id)); continue; }
                if (!seen.add(e.getId())) continue;
                MusicTrackMemory y = new MusicTrackMemory();
                y.setTrack(x); y.setEpisode(e);
                y.setRole(blank(m.role) ? MusicTrackMemory.Role.TIED : enumOf(MusicTrackMemory.Role.class, m.role, w + ".memories.role"));
                y.setNote(text(m.note, 1000)); y.setSortOrder(i++);
                trackMemories.save(y);
            }
            c.apply("memories").merge("written", i, Integer::sum);
        }
        if (t.events != null) {
            trackEvents.deleteAll(trackEvents.findByTrackId(x.getId()));
            em.flush();
            List<UUID> ids = t.events.stream().filter(Objects::nonNull).map(m -> m.id).filter(Objects::nonNull).distinct().toList();
            Map<UUID, LifeEvent> evs = eventRepo.findAllById(ids).stream().collect(Collectors.toMap(LifeEvent::getId, e -> e));
            Set<UUID> seen = new HashSet<>();
            int i = 0;
            for (MusicDto.TieIn m : t.events) {
                LifeEvent e = m == null || m.id == null ? null : evs.get(m.id);
                if (e == null) { warnings.add(w + ".events: no event " + (m == null ? null : m.id)); continue; }
                if (!seen.add(e.getId())) continue;
                MusicTrackEvent y = new MusicTrackEvent();
                y.setTrack(x); y.setEvent(e);
                y.setRole(blank(m.role) ? MusicTrackMemory.Role.TIED : enumOf(MusicTrackMemory.Role.class, m.role, w + ".events.role"));
                y.setNote(text(m.note, 1000)); y.setSortOrder(i++);
                trackEvents.save(y);
            }
            c.apply("events").merge("written", i, Integer::sum);
        }
    }

    private void applyCd(MusicCd x, MusicDto.CdIn d, Book book, List<String> warnings) {
        String w = "cds[" + x.getExternalKey() + "]";
        if (!blank(d.title)) x.setTitle(cut(d.title.trim(), 300));
        if (d.albumKey != null) {
            if (d.albumKey.isBlank()) x.setAlbum(null);
            else {
                MusicAlbum a = book.album(d.albumKey.trim());
                if (a == null) warnings.add(w + ".albumKey: no album " + d.albumKey);
                else x.setAlbum(a);
            }
        }
        if (d.edition != null) x.setEdition(text(d.edition, 200));
        if (d.format != null) x.setFormat(text(d.format, 40));
        if (d.discs != null) x.setDiscs(d.discs > 0 ? d.discs : null);
        if (d.acquired != null) {
            if (d.acquired.isBlank()) { x.setAcquiredAt(null); x.setAcquiredPrecision(null); x.setAcquiredApprox(null); }
            else { Dated a = dated(d.acquired, d.acquiredPrecision, w + ".acquired"); x.setAcquiredAt(a.at()); x.setAcquiredPrecision(a.precision()); }
        }
        if (d.acquiredApprox != null) x.setAcquiredApprox(d.acquiredApprox ? Boolean.TRUE : null);
        if (d.acquiredVia != null) x.setAcquiredVia(text(d.acquiredVia, 200));
        if (d.sourceFolder != null) x.setSourceFolder(text(d.sourceFolder, 500));
        if (d.note != null) x.setNote(d.note.isBlank() ? null : d.note.trim());
    }

    private void cdMediaList(MusicCd x, List<MusicDto.MediaIn> in, List<String> warnings, Function<String, Map<String, Integer>> c) {
        String w = "cds[" + x.getExternalKey() + "]";
        cdMedia.deleteAll(cdMedia.findByCdId(x.getId()));
        em.flush();
        Map<UUID, MediaFile> files = mediaRepo.findAllById(in.stream().filter(Objects::nonNull).map(m -> m.mediaId).filter(Objects::nonNull).distinct().toList())
            .stream().collect(Collectors.toMap(MediaFile::getId, m -> m));
        Set<UUID> seen = new HashSet<>();
        int i = 0;
        for (MusicDto.MediaIn m : in) {
            MediaFile f = m == null || m.mediaId == null ? null : files.get(m.mediaId);
            if (f == null) { warnings.add(w + ".media[" + i + "]: no file " + (m == null ? null : m.mediaId)); i++; continue; }
            if (!seen.add(f.getId())) { i++; continue; }
            MusicCdMedia y = new MusicCdMedia();
            y.setCd(x); y.setMedia(f);
            y.setRole(blank(m.role) ? MusicCdMedia.Role.PHOTO : enumOf(MusicCdMedia.Role.class, m.role, w + ".media[" + i + "].role"));
            y.setLabel(text(m.label, 300)); y.setSortOrder(i++);
            cdMedia.save(y);
        }
        c.apply("cdMedia").merge("written", seen.size(), Integer::sum);
    }

    private void applyPlaylist(MusicPlaylist x, MusicDto.PlaylistIn p, Book book, List<String> warnings) {
        String w = "playlists[" + x.getExternalKey() + "]";
        if (!blank(p.title)) x.setTitle(cut(p.title.trim(), 300));
        if (!blank(p.kind)) x.setKind(enumOf(MusicPlaylist.Kind.class, p.kind, w + ".kind"));
        if (p.taken != null) {
            if (p.taken.isBlank()) { x.setTakenAt(null); x.setTakenPrecision(null); x.setTakenApprox(null); }
            else { Dated d = dated(p.taken, p.takenPrecision, w + ".taken"); x.setTakenAt(d.at()); x.setTakenPrecision(d.precision()); }
        }
        if (p.takenApprox != null) x.setTakenApprox(p.takenApprox ? Boolean.TRUE : null);
        if (p.windowFrom != null) x.setWindowFrom(p.windowFrom.isBlank() ? null : dated(p.windowFrom, null, w + ".windowFrom").at());
        if (p.device != null) {
            if (p.device.isBlank()) x.setDevice(null);
            else {
                DeskDevice d = book.device(p.device.trim());
                if (d == null) warnings.add(w + ".device: no device " + p.device);
                else x.setDevice(d);
            }
        }
        if (p.eventId != null) {
            if (NIL.equals(p.eventId)) x.setEvent(null);
            else {
                LifeEvent e = eventRepo.findById(p.eventId).orElse(null);
                if (e == null) warnings.add(w + ".eventId: no event " + p.eventId);
                else x.setEvent(e);
            }
        }
        if (p.sourceFolder != null) x.setSourceFolder(text(p.sourceFolder, 500));
        if (p.spotifyId != null) x.setSpotifyId(text(p.spotifyId, 40));
        if (p.summary != null) x.setSummary(p.summary.isBlank() ? null : p.summary.trim());
        if (p.note != null) x.setNote(p.note.isBlank() ? null : p.note.trim());
        if (p.sortOrder != null) x.setSortOrder(p.sortOrder);
    }

    private void entryList(MusicPlaylist x, List<MusicDto.EntryIn> in, Book book, List<String> warnings, Function<String, Map<String, Integer>> c) {
        String w = "playlists[" + x.getExternalKey() + "]";
        entries.deleteAll(entries.findByPlaylistId(x.getId()));
        em.flush();
        Set<UUID> seen = new HashSet<>();
        int i = 0;
        for (MusicDto.EntryIn e : in) {
            MusicTrack t = e == null || blank(e.track) ? null : book.track(e.track.trim());
            if (t == null) { warnings.add(w + ".entries[" + i + "]: no recording " + (e == null ? null : e.track)); i++; continue; }
            if (!seen.add(t.getId())) { i++; continue; }
            MusicPlaylistEntry y = new MusicPlaylistEntry();
            y.setPlaylist(x); y.setTrack(t);
            y.setPosition(e.position != null ? e.position : i);
            y.setFileName(text(e.fileName, 300)); y.setNote(text(e.note, 1000));
            if (!blank(e.fileModifiedAt)) y.setFileModifiedAt(dated(e.fileModifiedAt, null, w + ".entries[" + i + "].fileModifiedAt").at());
            if (!blank(e.addedAt)) y.setAddedAt(dated(e.addedAt, null, w + ".entries[" + i + "].addedAt").at());
            entries.save(y);
            i++;
        }
        c.apply("entries").merge("written", seen.size(), Integer::sum);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private record Dated(LocalDateTime at, DatePrecision precision) {}

    /** yyyy | yyyy-MM | yyyy-MM-dd | yyyy-MM-ddTHH:mm[:ss]; the start of the span its precision says. */
    private static Dated dated(String v, String precision, String where) {
        try {
            EventDateDto d = new EventDateDto(); d.setDate(v); d.setPrecision(precision);
            DatePrecision p = d.parsedPrecision();
            return new Dated(p.floor(d.parsedDate()), p);
        } catch (RuntimeException e) {
            throw new IllegalArgumentException(where + ": a date as yyyy, yyyy-MM, yyyy-MM-dd or yyyy-MM-ddTHH:mm (\"" + v + "\")");
        }
    }

    /** "2012", "2012-06", "2012-06-01", "2012-06-01T21:00" → the moment (start of that span). */
    public static LocalDateTime moment(String v) { return dated(v, null, "at").at(); }

    private static Integer favorite(Integer v, String where) {
        if (v == 0) return null;
        if (v < 1 || v > 5) throw new IllegalArgumentException(where + ".favorite: 1 to 5 (0 clears)");
        return v;
    }

    MusicArtist getArtist(String key) { return artists.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("Artist not found: " + key)); }
    MusicAlbum getAlbum(String key) { return albums.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("Album not found: " + key)); }
    MusicTrack getTrack(String key) { return tracks.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("Recording not found: " + key)); }
    MusicCd getCd(String key) { return cds.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("CD not found: " + key)); }
    MusicPlaylist getPlaylist(String key) { return playlists.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("List not found: " + key)); }

    static String key(String k, String where) {
        String v = k == null ? "" : k.trim();
        if (!KEY.matcher(v).matches()) throw new IllegalArgumentException(where + ": a key of lowercase letters, digits and dashes (\"" + k + "\")");
        return v;
    }

    private static <E extends Enum<E>> E enumOf(Class<E> type, String v, String where) {
        try { return Enum.valueOf(type, v.trim().toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException e) { throw new IllegalArgumentException(where + ": one of " + Arrays.toString(type.getEnumConstants())); }
    }

    private static String text(String v, int max) {
        if (v == null || v.isBlank()) return null;
        return cut(v.trim(), max);
    }

    private static String cut(String v, int max) { return v.length() <= max ? v : v.substring(0, max); }
    private static boolean blank(String v) { return v == null || v.isBlank(); }
    private static <T> List<T> nn(List<T> l) { return l == null ? List.of() : l; }
}
