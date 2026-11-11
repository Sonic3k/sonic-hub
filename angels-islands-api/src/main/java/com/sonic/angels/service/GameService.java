package com.sonic.angels.service;

import com.sonic.angels.model.dto.EventDateDto;
import com.sonic.angels.model.dto.GameDto;
import com.sonic.angels.model.dto.MediaFileDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import jakarta.persistence.EntityManager;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * The game shelf ("Kệ game"): games, their series, when he played them and on which machine, their pictures, the
 * memories and notes they are in, links, and the packages that play them (files in the private games bucket, see
 * {@link GamePackageService}). Read by Sonic Hub, written by the admin and by importers (sync, matched by key).
 */
@Service
@Transactional
public class GameService {

    private static final UUID NIL = new UUID(0, 0);
    private static final Pattern KEY = Pattern.compile("[a-z0-9][a-z0-9-]{0,119}");
    /** the order a game's own pictures are picked in for its cover */
    private static final List<String> COVER_ROLES = List.of("ART", "SCREENSHOT", "PHOTO", "SCAN", "MAP");

    private final GameRepository games;
    private final GameSeriesRepository seriesRepo;
    private final GamePlayRepository plays;
    private final GameLinkRepository links;
    private final GameMediaRepository gameMedia;
    private final GameMemoryRepository gameMemories;
    private final GameNoteRepository gameNotes;
    private final GamePackageRepository packages;
    private final MediaFileRepository mediaRepo;
    private final EpisodeRepository episodeRepo;
    private final JournalNoteRepository noteRepo;
    private final DeskDeviceRepository deviceRepo;
    private final StorageService storage;
    private final NamedParameterJdbcTemplate jdbc;
    private final DtoMapper mapper;
    private final EntityManager em;

    public GameService(GameRepository games, GameSeriesRepository seriesRepo, GamePlayRepository plays, GameLinkRepository links,
                       GameMediaRepository gameMedia, GameMemoryRepository gameMemories, GameNoteRepository gameNotes,
                       GamePackageRepository packages, MediaFileRepository mediaRepo, EpisodeRepository episodeRepo,
                       JournalNoteRepository noteRepo, DeskDeviceRepository deviceRepo, StorageService storage,
                       NamedParameterJdbcTemplate jdbc, DtoMapper mapper, EntityManager em) {
        this.games = games; this.seriesRepo = seriesRepo; this.plays = plays; this.links = links; this.gameMedia = gameMedia;
        this.gameMemories = gameMemories; this.gameNotes = gameNotes; this.packages = packages; this.mediaRepo = mediaRepo;
        this.episodeRepo = episodeRepo; this.noteRepo = noteRepo; this.deviceRepo = deviceRepo; this.storage = storage;
        this.jdbc = jdbc; this.mapper = mapper; this.em = em;
    }

    // ── read ────────────────────────────────────────────────────────────────

    /** Every game, the ones he played first in the order he first played them, then by year. */
    @Transactional(readOnly = true)
    public List<GameDto.Card> list() {
        List<Game> all = games.findAllWithSeries();
        Shelf s = shelf(all);
        return all.stream().map(g -> card(g, s)).sorted(ORDER).toList();
    }

    @Transactional(readOnly = true)
    public GameDto.Detail detail(String key) {
        Game g = get(key);
        List<Game> all = games.findAllWithSeries();
        Shelf s = shelf(all);
        GameDto.Detail d = new GameDto.Detail();
        fill(d, g, s);
        d.summary = g.getSummary(); d.note = g.getNote(); d.coverMediaId = g.getCoverMediaId(); d.iconMediaId = g.getIconMediaId();
        if (g.getBasedOn() != null) d.basedOn = card(g.getBasedOn(), s);
        d.derived = all.stream().filter(x -> x.getBasedOn() != null && x.getBasedOn().getId().equals(g.getId())).map(x -> card(x, s)).sorted(ORDER).toList();
        d.seriesGames = g.getSeries() == null ? List.of() : all.stream()
            .filter(x -> x.getSeries() != null && x.getSeries().getId().equals(g.getSeries().getId()))
            .map(x -> card(x, s)).sorted(SERIES_ORDER).toList();
        d.plays = plays.findByGame(g.getId()).stream().map(this::play).toList();
        d.links = links.findByGameIdOrderBySortOrderAsc(g.getId()).stream().map(GameService::link).toList();
        d.media = gameMedia.findByGame(g.getId()).stream().map(this::media).toList();
        d.memories = gameMemories.findByGame(g.getId()).stream().map(GameMemory::getEpisode).map(this::memory)
            .sorted(Comparator.comparing((GameDto.Memory m) -> m.occurredAt, Comparator.nullsLast(Comparator.naturalOrder()))).toList();
        d.notes = gameNotes.findByGame(g.getId()).stream().map(GameNote::getNote).map(GameService::noteRef).toList();
        List<GamePackage> pk = packages.findByGameIdOrderBySortOrderAsc(g.getId());
        d.packages = pk.stream().map(GameService::pkg).toList();
        d.spots = spots(pk, plays.findByGame(g.getId()));
        return d;
    }

    @Transactional(readOnly = true)
    public List<GameDto.Series> seriesList() {
        List<Game> all = games.findAllWithSeries();
        Shelf s = shelf(all);
        return seriesRepo.findAll().stream().map(x -> series(x, all, s))
            .sorted(Comparator.comparing((GameDto.Series x) -> x.sortOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(x -> x.name, String.CASE_INSENSITIVE_ORDER))
            .toList();
    }

    @Transactional(readOnly = true)
    public GameDto.Series series(String key) {
        GameSeries x = seriesRepo.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("Series not found: " + key));
        List<Game> all = games.findAllWithSeries();
        GameDto.Series out = series(x, all, shelf(all));
        out.summary = x.getSummary();
        return out;
    }

    private GameDto.Series series(GameSeries x, List<Game> all, Shelf s) {
        GameDto.Series out = new GameDto.Series();
        out.id = x.getId(); out.key = x.getExternalKey(); out.name = x.getName(); out.summary = x.getSummary();
        out.sortOrder = x.getSortOrder(); out.coverMediaId = x.getCoverMediaId();
        out.games = all.stream().filter(g -> g.getSeries() != null && g.getSeries().getId().equals(x.getId()))
            .map(g -> card(g, s)).sorted(SERIES_ORDER).toList();
        if (x.getCoverMediaId() != null) mediaRepo.findById(x.getCoverMediaId()).map(mapper::imageUrl).ifPresent(u -> out.coverUrl = u);
        if (out.coverUrl == null) out.coverUrl = out.games.stream().filter(c -> c.coverUrl != null && !c.kind.equals("HOMEMADE"))
            .map(c -> c.coverUrl).findFirst().orElse(out.games.stream().map(c -> c.coverUrl).filter(Objects::nonNull).findFirst().orElse(null));
        return out;
    }

    /** The games he played first come first (in the order he first played them), then the rest by year and name. */
    private static final Comparator<GameDto.Card> ORDER = Comparator
        .comparing((GameDto.Card c) -> c.playFrom, Comparator.nullsLast(Comparator.naturalOrder()))
        .thenComparing(c -> c.releaseYear, Comparator.nullsLast(Comparator.naturalOrder()))
        .thenComparing(c -> c.title, String.CASE_INSENSITIVE_ORDER);

    private static final Comparator<GameDto.Card> SERIES_ORDER = Comparator
        .comparing((GameDto.Card c) -> c.seriesOrder, Comparator.nullsLast(Comparator.naturalOrder()))
        .thenComparing(c -> c.releaseYear, Comparator.nullsLast(Comparator.naturalOrder()))
        .thenComparing(c -> c.title, String.CASE_INSENSITIVE_ORDER);

    /** What the cards of the shelf need, read once for all games. */
    private record Shelf(Map<UUID, List<GamePlay>> plays, Map<UUID, String> pictures, Map<UUID, String> firstPicture,
                         Set<UUID> portal, Set<UUID> machine, Set<UUID> linked) {}

    private Shelf shelf(List<Game> all) {
        Map<UUID, List<GamePlay>> byGame = plays.findAllWithDevice().stream()
            .collect(Collectors.groupingBy(p -> p.getGame().getId(), LinkedHashMap::new, Collectors.toList()));
        Set<UUID> ids = new HashSet<>();
        for (Game g : all) { if (g.getCoverMediaId() != null) ids.add(g.getCoverMediaId()); if (g.getIconMediaId() != null) ids.add(g.getIconMediaId()); }
        Map<UUID, String> pictures = new HashMap<>();
        if (!ids.isEmpty()) for (MediaFile m : mediaRepo.findAllById(ids)) pictures.put(m.getId(), mapper.imageUrl(m));
        Map<UUID, String> first = new HashMap<>();
        org.springframework.jdbc.core.RowCallbackHandler put = rs -> {
            UUID g = rs.getObject("g", UUID.class);
            if (first.containsKey(g)) return;
            String ft = rs.getString("file_type"), sp = rs.getString("storage_provider");
            String url = mapper.imageUrl(rs.getString("poster_storage_key"), ft == null ? null : MediaFile.FileType.valueOf(ft),
                rs.getString("storage_key"), sp == null ? null : MediaFile.StorageProvider.valueOf(sp));
            if (url != null) first.put(g, url);
        };
        // its own pictures first (art, screenshots, photos, scans, maps), then the first picture of the memories it is in
        jdbc.query("SELECT DISTINCT ON (gm.game_id) gm.game_id AS g, m.poster_storage_key, m.file_type, m.storage_key, m.storage_provider "
            + "FROM game_media gm JOIN media_files m ON m.id = gm.media_file_id WHERE gm.role <> 'ICON' AND (m.file_type = 'IMAGE' OR m.poster_storage_key IS NOT NULL) "
            + "ORDER BY gm.game_id, CASE gm.role WHEN 'ART' THEN 0 WHEN 'SCREENSHOT' THEN 1 WHEN 'PHOTO' THEN 2 WHEN 'SCAN' THEN 3 ELSE 4 END, "
            + "gm.sort_order NULLS LAST, m.effective_date NULLS LAST", new MapSqlParameterSource(), put);
        jdbc.query("SELECT DISTINCT ON (gx.game_id) gx.game_id AS g, m.poster_storage_key, m.file_type, m.storage_key, m.storage_provider "
            + "FROM game_memories gx JOIN episode_media em ON em.episode_id = gx.episode_id JOIN media_files m ON m.id = em.media_file_id "
            + "WHERE m.file_type = 'IMAGE' ORDER BY gx.game_id, gx.sort_order NULLS LAST, em.position", new MapSqlParameterSource(), put);
        Set<UUID> portal = new HashSet<>(), machine = new HashSet<>();
        Set<String> placed = new HashSet<>(jdbc.queryForList("SELECT DISTINCT target FROM desk_items WHERE app = 'game' AND target IS NOT NULL",
            new MapSqlParameterSource(), String.class));
        Set<String> emulators = new HashSet<>(jdbc.queryForList("SELECT DISTINCT target FROM desk_items WHERE app = 'emulator' AND target IS NOT NULL",
            new MapSqlParameterSource(), String.class));
        for (GamePackage p : packages.findAllWithGame()) {
            if (Boolean.TRUE.equals(p.getPortal())) portal.add(p.getGame().getId());
            if (placed.contains(p.getExternalKey()) || emulators.contains(emuOf(p))) machine.add(p.getGame().getId());
        }
        // games with something of his on them besides plays: pictures, memories, notes, packages
        Set<UUID> linked = new HashSet<>(jdbc.queryForList("SELECT game_id FROM game_media UNION SELECT game_id FROM game_memories "
            + "UNION SELECT game_id FROM game_notes UNION SELECT game_id FROM game_packages", new MapSqlParameterSource(), UUID.class));
        // and the games his own games come from (Citadels behind Masks & Mortar)
        for (Game g : all) if (g.getBasedOn() != null) linked.add(g.getBasedOn().getId());
        return new Shelf(byGame, pictures, first, portal, machine, linked);
    }

    private GameDto.Card card(Game g, Shelf s) {
        GameDto.Card c = new GameDto.Card();
        fill(c, g, s);
        return c;
    }

    private void fill(GameDto.Card c, Game g, Shelf s) {
        c.id = g.getId(); c.key = g.getExternalKey(); c.title = g.getTitle(); c.kind = g.getKind().name();
        c.platform = g.getPlatform(); c.developer = g.getDeveloper(); c.genre = g.getGenre(); c.versions = g.getVersions();
        c.handName = g.getHandName(); c.handOrder = g.getHandOrder(); c.releaseYear = g.getReleaseYear(); c.seriesOrder = g.getSeriesOrder();
        c.favorite = Boolean.TRUE.equals(g.getFavorite());
        c.series = g.getSeries() == null ? null : new GameDto.SeriesRef(g.getSeries().getExternalKey(), g.getSeries().getName());
        c.basedOnKey = g.getBasedOn() == null ? null : g.getBasedOn().getExternalKey();
        c.iconUrl = g.getIconMediaId() == null ? null : s.pictures().get(g.getIconMediaId());
        c.coverUrl = g.getCoverMediaId() != null && s.pictures().get(g.getCoverMediaId()) != null ? s.pictures().get(g.getCoverMediaId())
            : s.firstPicture().get(g.getId());
        List<GamePlay> ps = s.plays().getOrDefault(g.getId(), List.of());
        if (!ps.isEmpty()) {
            c.playFrom = ps.stream().map(GamePlay::getStartAt).min(Comparator.naturalOrder()).orElse(null);
            c.playTo = ps.stream().map(GamePlay::endExclusive).max(Comparator.naturalOrder()).orElse(null);
            c.played = years(ps);
            c.devices = ps.stream().map(GamePlay::getDevice).filter(Objects::nonNull).map(DeskDevice::getExternalKey).distinct().toList();
        } else c.devices = List.of();
        c.spans = ps.stream().map(p -> new GameDto.Span(p.getStartAt(), p.endExclusive(), p.getDevice() == null ? null : p.getDevice().getExternalKey())).toList();
        c.portal = s.portal().contains(g.getId());
        c.machine = s.machine().contains(g.getId());
        c.mine = !ps.isEmpty() || s.linked().contains(g.getId()) || g.getHandName() != null || g.getKind() != Game.Kind.OFFICIAL
            || Boolean.TRUE.equals(g.getFavorite());
    }

    /** "2007", "2007 – 2010", "~2004" (the first year is approximate) */
    private static String years(List<GamePlay> ps) {
        GamePlay first = ps.stream().min(Comparator.comparing(GamePlay::getStartAt)).orElseThrow();
        int from = first.getStartAt().getYear();
        int to = ps.stream().map(p -> p.endExclusive().minusSeconds(1).getYear()).max(Integer::compare).orElse(from);
        String t = from == to ? String.valueOf(from) : from + " – " + to;
        return Boolean.TRUE.equals(first.getApprox()) ? "~" + t : t;
    }

    /** Every play that left a trace, oldest first: what the game pages show under each game, in one list. */
    @Transactional(readOnly = true)
    public List<GameDto.Trace> traces() {
        return plays.findAllWithDevice().stream().filter(p -> p.getEvidence() != null && !p.getEvidence().isBlank())
            .map(p -> new GameDto.Trace(p.getGame().getExternalKey(), p.getGame().getTitle(), play(p))).toList();
    }

    private GameDto.Play play(GamePlay p) {
        GameDto.Play o = new GameDto.Play();
        o.id = p.getId(); o.startAt = p.getStartAt(); o.endAt = p.getEndAt();
        o.precision = p.getPrecision() == null ? null : p.getPrecision().name(); o.approx = Boolean.TRUE.equals(p.getApprox());
        o.when = LifeEventService.whenText(p.getStartAt(), p.getPrecision(), o.approx, p.getEndAt());
        if (p.getDevice() != null) { o.deviceKey = p.getDevice().getExternalKey(); o.deviceName = p.getDevice().getName(); o.at = machineAt(p); }
        o.via = p.getVia(); o.version = p.getVersion(); o.evidence = p.getEvidence(); o.note = p.getNote();
        return o;
    }

    /** The evening a play's machine is opened at: the middle of what its date says (a play known by its year: mid-June;
     *  by its month: the 15th), moved into the days that machine was there. A play of "2002" on the school's computer,
     *  which he first sat at in September 2002, opens in September — a day in June would start the computer he had at
     *  home instead, since the school's was not there yet. */
    private static String machineAt(GamePlay p) {
        DatePrecision prec = p.getPrecision() == null ? DatePrecision.DAY : p.getPrecision();
        LocalDate start = p.getStartAt().toLocalDate();
        LocalDate d = prec == DatePrecision.YEAR || prec == DatePrecision.DECADE ? LocalDate.of(start.getYear(), 6, 15)
            : prec == DatePrecision.MONTH || prec == DatePrecision.SEASON ? start.withDayOfMonth(15) : start;
        if (!d.isBefore(p.endExclusive().toLocalDate())) d = start;
        LocalDateTime from = p.getDevice().getValidFrom(), to = p.getDevice().getValidTo();
        if (from != null && d.isBefore(from.toLocalDate())) d = from.toLocalDate();
        if (to != null && !d.isBefore(to.toLocalDate())) d = to.toLocalDate().minusDays(1);
        return d + "T21:00";
    }

    private static GameDto.Link link(GameLink l) {
        GameDto.Link o = new GameDto.Link();
        o.id = l.getId(); o.kind = l.getKind().name(); o.title = l.getTitle(); o.url = l.getUrl(); o.note = l.getNote();
        return o;
    }

    private GameDto.Media media(GameMedia gm) {
        GameDto.Media o = new GameDto.Media();
        o.linkId = gm.getId(); o.role = gm.getRole().name(); o.label = gm.getLabel();
        o.media = mapper.toMediaFileResponse(gm.getMedia(), MediaFileDto.Includes.none());
        return o;
    }

    private GameDto.Memory memory(Episode e) {
        GameDto.Memory m = new GameDto.Memory();
        m.id = e.getId(); m.title = e.getTitle(); m.summary = e.getSummary(); m.when = e.whenText(); m.kind = e.getKind();
        m.occurredAt = e.getOccurredAt();
        m.coverUrl = e.getMediaFiles().stream().filter(Objects::nonNull).filter(x -> x.getFileType() == MediaFile.FileType.IMAGE)
            .map(mapper::imageUrl).filter(Objects::nonNull).findFirst().orElse(null);
        m.persons = e.getPersons().stream().sorted(Comparator.comparing(p -> Objects.toString(p.getName(), "")))
            .map(p -> new GameDto.PersonRef(p.getId(), p.getDisplayName() != null ? p.getDisplayName() : p.getName(), mapper.toPersonSummary(p).getAvatarUrl()))
            .toList();
        return m;
    }

    private static GameDto.NoteRef noteRef(JournalNote n) {
        GameDto.NoteRef o = new GameDto.NoteRef();
        o.id = n.getId(); o.title = n.getTitle(); o.slug = n.getSlug(); o.excerpt = n.getExcerpt();
        o.kind = n.getKind().name(); o.status = n.getStatus().name(); o.writtenAt = n.getWrittenAt() != null ? n.getWrittenAt() : n.getCreatedAt();
        return o;
    }

    static GameDto.Package pkg(GamePackage p) {
        GameDto.Package o = new GameDto.Package();
        o.id = p.getId(); o.key = p.getExternalKey(); o.engine = p.getEngine().name(); o.title = p.getTitle();
        o.fileName = p.getFileName(); o.fileSize = p.getFileSize(); o.hasFile = p.getStorageKey() != null;
        o.saveFileName = p.getSaveFileName(); o.saveSize = p.getSaveSize(); o.saveAt = p.getSaveAt(); o.hasSave = p.getSaveStorageKey() != null;
        o.config = p.getConfig(); o.note = p.getNote(); o.portal = Boolean.TRUE.equals(p.getPortal());
        o.gameKey = p.getGame().getExternalKey(); o.gameTitle = p.getGame().getTitle();
        return o;
    }

    /** Where the packages play inside the machines (desk items with app game), and a moment to start each machine at:
     *  when he played it there if that is known, else early in the item's time on that machine. */
    /** the emulator a ROM package plays in on the machines (config {"emu": "vba"}), or null */
    static String emuOf(GamePackage p) {
        if (p.getConfig() == null) return null;
        java.util.regex.Matcher m = EMU.matcher(p.getConfig());
        return m.find() ? m.group(1) : null;
    }
    private static final java.util.regex.Pattern EMU = java.util.regex.Pattern.compile("\"emu\"\\s*:\\s*\"([a-z0-9-]+)\"");

    private List<GameDto.Spot> spots(List<GamePackage> pk, List<GamePlay> ps) {
        List<String> keys = pk.stream().map(GamePackage::getExternalKey).toList();
        if (keys.isEmpty()) return List.of();
        List<GameDto.Spot> out = new ArrayList<>(spotsOf(keys, ps));
        // a ROM plays where its emulator is: the emulator's item on a machine stands for each of its games
        Map<String, List<String>> byEmu = new LinkedHashMap<>();
        for (GamePackage p : pk) { String e = emuOf(p); if (e != null) byEmu.computeIfAbsent(e, k -> new ArrayList<>()).add(p.getExternalKey()); }
        if (!byEmu.isEmpty()) {
            jdbc.query("SELECT i.target, i.label, i.valid_from, i.valid_to, d.external_key AS dkey, d.name AS dname, d.valid_from AS dfrom, d.valid_to AS dto "
                    + "FROM desk_items i JOIN desk_devices d ON d.id = i.device_id WHERE i.app = 'emulator' AND i.target IN (:emus) "
                    + "ORDER BY COALESCE(i.valid_from, d.valid_from) NULLS FIRST, i.sort_order NULLS LAST",
                new MapSqlParameterSource("emus", byEmu.keySet()), rs -> {
                    for (String key : byEmu.get(rs.getString("target"))) {
                        GameDto.Spot s = new GameDto.Spot();
                        s.packageKey = key; s.label = rs.getString("label");
                        s.deviceKey = rs.getString("dkey"); s.deviceName = rs.getString("dname");
                        LocalDateTime f = later(ts(rs, "valid_from"), ts(rs, "dfrom")), t = earlier(ts(rs, "valid_to"), ts(rs, "dto"));
                        s.from = f; s.to = t;
                        s.at = startAt(f, t, ps, s.deviceKey);
                        if (s.at != null) out.add(s);
                    }
                });
        }
        return out;
    }

    private List<GameDto.Spot> spotsOf(List<String> keys, List<GamePlay> ps) {
        List<GameDto.Spot> out = new ArrayList<>();
        jdbc.query("SELECT i.target, i.label, i.valid_from, i.valid_to, d.external_key AS dkey, d.name AS dname, d.valid_from AS dfrom, d.valid_to AS dto "
                + "FROM desk_items i JOIN desk_devices d ON d.id = i.device_id WHERE i.app = 'game' AND i.target IN (:keys) "
                + "ORDER BY COALESCE(i.valid_from, d.valid_from) NULLS FIRST, i.sort_order NULLS LAST",
            new MapSqlParameterSource("keys", keys), rs -> {
                GameDto.Spot s = new GameDto.Spot();
                s.packageKey = rs.getString("target"); s.label = rs.getString("label");
                s.deviceKey = rs.getString("dkey"); s.deviceName = rs.getString("dname");
                LocalDateTime f = later(ts(rs, "valid_from"), ts(rs, "dfrom")), t = earlier(ts(rs, "valid_to"), ts(rs, "dto"));
                s.from = f; s.to = t;
                s.at = startAt(f, t, ps, s.deviceKey);
                if (s.at != null) out.add(s);
            });
        return out;
    }

    private static String startAt(LocalDateTime from, LocalDateTime to, List<GamePlay> ps, String device) {
        LocalDate lo = from == null ? null : from.toLocalDate().plusDays(1), hi = to == null ? null : to.toLocalDate().minusDays(1);
        if (lo != null && hi != null && hi.isBefore(lo)) return null;
        LocalDate pick = null;
        for (GamePlay p : ps) {          // when he played it on that machine, as near as it is known
            if (p.getDevice() == null || !p.getDevice().getExternalKey().equals(device)) continue;
            LocalDate d = p.getStartAt().toLocalDate();
            if ((lo == null || !d.isBefore(lo)) && (hi == null || !d.isAfter(hi))) { pick = d; break; }
        }
        if (pick == null) {
            for (GamePlay p : ps) {      // any time he played it, if the machine was his then
                LocalDate d = p.getStartAt().toLocalDate();
                if ((lo == null || !d.isBefore(lo)) && (hi == null || !d.isAfter(hi))) { pick = d; break; }
            }
        }
        if (pick == null) pick = lo != null ? lo : (hi != null ? hi : LocalDate.now());
        return pick + "T21:00";
    }

    private static LocalDateTime ts(java.sql.ResultSet rs, String col) throws java.sql.SQLException {
        java.sql.Timestamp t = rs.getTimestamp(col);
        return t == null ? null : t.toLocalDateTime();
    }
    private static LocalDateTime later(LocalDateTime a, LocalDateTime b) { return a == null ? b : b == null ? a : a.isAfter(b) ? a : b; }
    private static LocalDateTime earlier(LocalDateTime a, LocalDateTime b) { return a == null ? b : b == null ? a : a.isBefore(b) ? a : b; }

    // ── write ───────────────────────────────────────────────────────────────

    /** Series, games and packages written at once, matched by key (what is not named stays as it is). */
    public GameDto.SyncResult sync(GameDto.Sync in) {
        Map<String, Map<String, Integer>> counts = new LinkedHashMap<>();
        List<String> warnings = new ArrayList<>();
        Function<String, Map<String, Integer>> c = k -> counts.computeIfAbsent(k, x -> new LinkedHashMap<>());
        String source = blank(in.source) ? null : in.source.trim();
        if (in.delete != null) {
            for (String k : nn(in.delete.packages)) packages.findByExternalKey(k).ifPresent(p -> { deletePackage(p); c.apply("packages").merge("deleted", 1, Integer::sum); });
            for (String k : nn(in.delete.games)) games.findByExternalKey(k).ifPresent(g -> { deleteGame(g); c.apply("games").merge("deleted", 1, Integer::sum); });
            for (String k : nn(in.delete.series)) seriesRepo.findByExternalKey(k).ifPresent(x -> { seriesRepo.delete(x); c.apply("series").merge("deleted", 1, Integer::sum); });
            em.flush();
        }
        for (GameDto.SeriesIn s : nn(in.series)) {
            boolean created = seriesRepo.findByExternalKey(key(s.key, "series.key")).isEmpty();
            putSeries(s, source);
            c.apply("series").merge(created ? "created" : "updated", 1, Integer::sum);
        }
        // games: fields first, then what points at other games and the lists
        Map<String, Game> written = new LinkedHashMap<>();
        for (GameDto.GameIn g : nn(in.games)) {
            String k = key(g.key, "games.key");
            Game x = games.findByExternalKey(k).orElse(null);
            boolean created = x == null;
            if (created) {
                if (blank(g.title)) throw new IllegalArgumentException("games[" + k + "]: title is required");
                x = new Game(); x.setExternalKey(k); x.setSource(source);
            }
            apply(x, g, warnings);
            games.save(x);
            written.put(k, x);
            c.apply("games").merge(created ? "created" : "updated", 1, Integer::sum);
        }
        em.flush();
        for (GameDto.GameIn g : nn(in.games)) {
            Game x = written.get(g.key.trim());
            if (g.basedOnKey != null) {
                if (g.basedOnKey.isBlank()) x.setBasedOn(null);
                else {
                    Game b = written.containsKey(g.basedOnKey) ? written.get(g.basedOnKey) : games.findByExternalKey(g.basedOnKey).orElse(null);
                    if (b == null) warnings.add("games[" + x.getExternalKey() + "].basedOnKey: no game " + g.basedOnKey);
                    else if (b.getId().equals(x.getId())) warnings.add("games[" + x.getExternalKey() + "]: a game cannot come from itself");
                    else x.setBasedOn(b);
                }
            }
            lists(x, g, warnings, c);
        }
        for (GameDto.PackageIn p : nn(in.packages)) {
            boolean created = packages.findByExternalKey(key(p.key, "packages.key")).isEmpty();
            putPackage(p);
            c.apply("packages").merge(created ? "created" : "updated", 1, Integer::sum);
        }
        return new GameDto.SyncResult(counts, warnings);
    }

    /** One game written by the admin (created when the key is new). */
    public GameDto.Detail put(String key, GameDto.GameIn in) {
        in.key = key;
        GameDto.Sync s = new GameDto.Sync();
        s.games = List.of(in);
        GameDto.SyncResult r = sync(s);
        if (!r.warnings().isEmpty()) throw new IllegalArgumentException(String.join("; ", r.warnings()));
        em.flush();
        return detail(key);
    }

    public void delete(String key) { deleteGame(get(key)); }

    public GameDto.Series putSeries(String key, GameDto.SeriesIn in) {
        in.key = key;
        putSeries(in, null);
        em.flush();
        return series(key);
    }

    public void deleteSeries(String key) {
        seriesRepo.delete(seriesRepo.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("Series not found: " + key)));
    }

    /** A picture taken off a game (the file itself stays where it is). */
    public void unlinkMedia(String key, UUID linkId) {
        Game g = get(key);
        GameMedia gm = gameMedia.findById(linkId).orElseThrow(() -> new NoSuchElementException("Picture link not found: " + linkId));
        if (!gm.getGame().getId().equals(g.getId())) throw new IllegalArgumentException("that picture is not on " + key);
        gameMedia.delete(gm);
    }

    private GameSeries putSeries(GameDto.SeriesIn s, String source) {
        String k = key(s.key, "series.key");
        GameSeries x = seriesRepo.findByExternalKey(k).orElse(null);
        if (x == null) {
            if (blank(s.name)) throw new IllegalArgumentException("series[" + k + "]: name is required");
            x = new GameSeries(); x.setExternalKey(k); x.setSource(source);
        }
        if (s.name != null && !s.name.isBlank()) x.setName(s.name.trim());
        if (s.summary != null) x.setSummary(s.summary.isBlank() ? null : s.summary.trim());
        if (s.coverMediaId != null) x.setCoverMediaId(NIL.equals(s.coverMediaId) ? null : s.coverMediaId);
        if (s.sortOrder != null) x.setSortOrder(s.sortOrder);
        return seriesRepo.save(x);
    }

    GamePackage putPackage(GameDto.PackageIn p) {
        String k = key(p.key, "packages.key");
        GamePackage x = packages.findByExternalKey(k).orElse(null);
        if (x == null) {
            if (blank(p.gameKey) || blank(p.engine)) throw new IllegalArgumentException("packages[" + k + "]: gameKey and engine are required");
            x = new GamePackage(); x.setExternalKey(k);
        }
        if (!blank(p.gameKey)) x.setGame(games.findByExternalKey(p.gameKey.trim()).orElseThrow(() -> new IllegalArgumentException("packages[" + k + "].gameKey: no game " + p.gameKey)));
        if (!blank(p.engine)) x.setEngine(enumOf(GamePackage.Engine.class, p.engine, "packages[" + k + "].engine"));
        if (p.title != null) x.setTitle(p.title.isBlank() ? null : p.title.trim());
        if (p.config != null) x.setConfig(p.config.isBlank() ? null : p.config);
        if (p.note != null) x.setNote(p.note.isBlank() ? null : p.note.trim());
        if (p.portal != null) x.setPortal(p.portal ? Boolean.TRUE : null);
        if (p.sortOrder != null) x.setSortOrder(p.sortOrder);
        return packages.save(x);
    }

    void deletePackage(GamePackage p) {
        String file = p.getStorageKey(), save = p.getSaveStorageKey();
        packages.delete(p);
        try { storage.deleteGameFile(file); storage.deleteGameFile(save); } catch (RuntimeException ignored) { /* the row is gone; a stray file costs nothing */ }
    }

    private void deleteGame(Game g) {
        for (GamePackage p : packages.findByGameIdOrderBySortOrderAsc(g.getId())) deletePackage(p);
        em.flush();
        games.delete(g);
    }

    private void apply(Game x, GameDto.GameIn g, List<String> warnings) {
        String w = "games[" + x.getExternalKey() + "]";
        if (!blank(g.title)) x.setTitle(g.title.trim());
        if (g.seriesKey != null) {
            if (g.seriesKey.isBlank()) x.setSeries(null);
            else {
                GameSeries s = seriesRepo.findByExternalKey(g.seriesKey.trim()).orElse(null);
                if (s == null) warnings.add(w + ".seriesKey: no series " + g.seriesKey);
                else x.setSeries(s);
            }
        }
        if (g.seriesOrder != null) x.setSeriesOrder(g.seriesOrder);
        if (!blank(g.kind)) x.setKind(enumOf(Game.Kind.class, g.kind, w + ".kind"));
        if (g.platform != null) x.setPlatform(text(g.platform, 80));
        if (g.releaseYear != null) x.setReleaseYear(g.releaseYear > 0 ? g.releaseYear : null);
        if (g.developer != null) x.setDeveloper(text(g.developer, 200));
        if (g.genre != null) x.setGenre(text(g.genre, 120));
        if (g.versions != null) x.setVersions(text(g.versions, 200));
        if (g.summary != null) x.setSummary(g.summary.isBlank() ? null : g.summary.trim());
        if (g.note != null) x.setNote(g.note.isBlank() ? null : g.note.trim());
        if (g.favorite != null) x.setFavorite(g.favorite ? Boolean.TRUE : null);
        if (g.coverMediaId != null) x.setCoverMediaId(NIL.equals(g.coverMediaId) ? null : g.coverMediaId);
        if (g.iconMediaId != null) x.setIconMediaId(NIL.equals(g.iconMediaId) ? null : g.iconMediaId);
        if (g.handName != null) x.setHandName(text(g.handName, 120));
        if (g.handOrder != null) x.setHandOrder(g.handOrder > 0 ? g.handOrder : null);
    }

    /** The lists of a game that were given, each replacing what it covers. */
    private void lists(Game x, GameDto.GameIn g, List<String> warnings, Function<String, Map<String, Integer>> c) {
        String w = "games[" + x.getExternalKey() + "]";
        if (g.plays != null) {
            plays.deleteAll(plays.findByGameId(x.getId()));
            em.flush();
            Map<String, DeskDevice> devices = new HashMap<>();
            int i = 0;
            for (GameDto.PlayIn p : g.plays) {
                if (p == null || blank(p.start)) { warnings.add(w + ".plays[" + i + "]: start is required"); i++; continue; }
                GamePlay y = new GamePlay();
                y.setGame(x);
                EventDateDto d = new EventDateDto(); d.setDate(p.start); d.setPrecision(p.precision);
                DatePrecision pr = d.parsedPrecision();
                y.setPrecision(pr); y.setStartAt(pr.floor(d.parsedDate()));
                y.setApprox(Boolean.TRUE.equals(p.approx) ? Boolean.TRUE : null);
                if (!blank(p.end)) { EventDateDto e = new EventDateDto(); e.setDate(p.end); y.setEndAt(e.parsedDate()); }
                if (y.getEndAt() != null && y.getEndAt().isBefore(y.getStartAt())) { warnings.add(w + ".plays[" + i + "]: end is before start"); y.setEndAt(null); }
                if (!blank(p.device)) {
                    DeskDevice dev = devices.computeIfAbsent(p.device.trim(), k -> deviceRepo.findByExternalKey(k).orElse(null));
                    if (dev == null) warnings.add(w + ".plays[" + i + "].device: no device " + p.device);
                    y.setDevice(dev);
                }
                y.setVia(text(p.via, 120)); y.setVersion(text(p.version, 120)); y.setEvidence(text(p.evidence, 2000)); y.setNote(text(p.note, 2000));
                y.setSortOrder(i++);
                plays.save(y);
            }
            c.apply("plays").merge("written", g.plays.size(), Integer::sum);
        }
        if (g.links != null) {
            links.deleteAll(links.findByGameIdOrderBySortOrderAsc(x.getId()));
            em.flush();
            int i = 0;
            for (GameDto.LinkIn l : g.links) {
                if (l == null || blank(l.url)) { warnings.add(w + ".links[" + i + "]: url is required"); i++; continue; }
                GameLink y = new GameLink();
                y.setGame(x);
                y.setKind(blank(l.kind) ? GameLink.Kind.OTHER : enumOf(GameLink.Kind.class, l.kind, w + ".links[" + i + "].kind"));
                y.setTitle(text(l.title, 300)); y.setUrl(cut(l.url.trim(), 1000)); y.setNote(text(l.note, 1000));
                y.setSortOrder(i++);
                links.save(y);
            }
            c.apply("links").merge("written", g.links.size(), Integer::sum);
        }
        if (g.media != null) {
            List<GameMedia> old = gameMedia.findByGameId(x.getId());
            Set<UUID> kept = new HashSet<>();
            for (GameMedia gm : old) {
                if (gm.getRole().own()) gameMedia.delete(gm); else kept.add(gm.getMedia().getId());
            }
            em.flush();
            Map<UUID, MediaFile> files = mediaRepo.findAllById(g.media.stream().filter(Objects::nonNull).map(m -> m.mediaId).filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(MediaFile::getId, m -> m));
            int i = 0;
            for (GameDto.MediaIn m : g.media) {
                MediaFile f = m == null || m.mediaId == null ? null : files.get(m.mediaId);
                if (f == null) { warnings.add(w + ".media[" + i + "]: no file " + (m == null ? null : m.mediaId)); i++; continue; }
                if (!kept.add(f.getId())) { i++; continue; }
                GameMedia y = new GameMedia();
                y.setGame(x); y.setMedia(f);
                GameMedia.Role role = blank(m.role) ? GameMedia.Role.SCREENSHOT : enumOf(GameMedia.Role.class, m.role, w + ".media[" + i + "].role");
                if (!role.own()) { warnings.add(w + ".media[" + i + "]: " + role + " pictures come through the assets endpoint"); i++; continue; }
                y.setRole(role); y.setLabel(text(m.label, 300)); y.setSortOrder(i++);
                gameMedia.save(y);
            }
            c.apply("media").merge("written", g.media.size(), Integer::sum);
        }
        if (g.memoryIds != null) {
            gameMemories.deleteAll(gameMemories.findByGameId(x.getId()));
            em.flush();
            Map<UUID, Episode> eps = episodeRepo.findAllById(g.memoryIds.stream().filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(Episode::getId, e -> e));
            int i = 0;
            for (UUID id : g.memoryIds.stream().filter(Objects::nonNull).distinct().toList()) {
                Episode e = eps.get(id);
                if (e == null) { warnings.add(w + ".memoryIds: no memory " + id); continue; }
                GameMemory y = new GameMemory(); y.setGame(x); y.setEpisode(e); y.setSortOrder(i++);
                gameMemories.save(y);
            }
            c.apply("memories").merge("written", i, Integer::sum);
        }
        if (g.noteIds != null) {
            gameNotes.deleteAll(gameNotes.findByGameId(x.getId()));
            em.flush();
            Map<UUID, JournalNote> ns = noteRepo.findAllById(g.noteIds.stream().filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(JournalNote::getId, n -> n));
            int i = 0;
            for (UUID id : g.noteIds.stream().filter(Objects::nonNull).distinct().toList()) {
                JournalNote n = ns.get(id);
                if (n == null) { warnings.add(w + ".noteIds: no note " + id); continue; }
                GameNote y = new GameNote(); y.setGame(x); y.setNote(n); y.setSortOrder(i++);
                gameNotes.save(y);
            }
            c.apply("notes").merge("written", i, Integer::sum);
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    Game get(String key) {
        return games.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("Game not found: " + key));
    }

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
