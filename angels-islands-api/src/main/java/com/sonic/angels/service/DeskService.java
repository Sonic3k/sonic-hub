package com.sonic.angels.service;

import com.sonic.angels.model.dto.DeskDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import com.sonic.angels.util.SocialTime;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

/**
 * The computer and phone of any moment. Devices, systems, wallpapers, icons and app versions are a few hundred rows,
 * so they are held in memory (rebuilt after every write) and a moment is resolved without touching the database; only
 * the things of that day (photos, memories, messages that just came in) are read per request.
 */
@Service
@Transactional(readOnly = true)
public class DeskService {

    private static final long FOLDER_CACHE_MS = 10 * 60_000L;
    private static final int DAY_PHOTOS = 12;
    private static final Set<DeskItem.Place> PHONE_PLACES = EnumSet.of(DeskItem.Place.HOME, DeskItem.Place.DOCK);

    private final DeskDeviceRepository deviceRepo;
    private final DeskSystemRepository systemRepo;
    private final DeskWallpaperRepository wallpaperRepo;
    private final DeskItemRepository itemRepo;
    private final DeskAppVersionRepository appRepo;
    private final EpisodeRepository episodeRepo;
    private final ChatMessageRepository messageRepo;
    private final CollectionService collections;
    private final StorageService storage;
    private final SocialReadService reads;
    private final EntityManager em;

    private volatile Snapshot snap;
    private volatile FolderTree tree;

    public DeskService(DeskDeviceRepository deviceRepo, DeskSystemRepository systemRepo, DeskWallpaperRepository wallpaperRepo,
                       DeskItemRepository itemRepo, DeskAppVersionRepository appRepo, EpisodeRepository episodeRepo,
                       ChatMessageRepository messageRepo, CollectionService collections, StorageService storage,
                       SocialReadService reads, EntityManager em) {
        this.deviceRepo = deviceRepo;
        this.systemRepo = systemRepo;
        this.wallpaperRepo = wallpaperRepo;
        this.itemRepo = itemRepo;
        this.appRepo = appRepo;
        this.episodeRepo = episodeRepo;
        this.messageRepo = messageRepo;
        this.collections = collections;
        this.storage = storage;
        this.reads = reads;
        this.em = em;
    }

    // ── The in-memory picture of the devices ─────────────────────────────────

    private record Span(LocalDateTime from, LocalDateTime to) {
        boolean covers(LocalDateTime t) { return (from == null || !from.isAfter(t)) && (to == null || to.isAfter(t)); }
        /** later start wins when two spans cover the same moment */
        static int later(Span a, Span b) { return Comparator.nullsFirst(Comparator.<LocalDateTime>naturalOrder()).compare(a.from, b.from); }
    }
    private record Dev(DeskDto.Device dto, UUID id, DeskDevice.Kind kind, Span span) {}
    private record Sys(UUID device, DeskDto.System dto, Span span) {}
    private record Wall(UUID device, DeskWallpaper.Place place, String key, DeskDto.Wallpaper dto, boolean isDefault, Span span) {}
    private record Itm(UUID device, DeskItem.Place place, DeskDto.Item dto, Span span) {}
    private record App(UUID device, String app, String version, Span span) {}
    private record Snapshot(List<Dev> devices, List<Sys> systems, List<Wall> walls, List<Itm> items, List<App> apps) {}

    /** Called after any write so the next read rebuilds the picture. */
    public void invalidate() { snap = null; }

    private Snapshot snap() {
        Snapshot s = snap;
        if (s != null) return s;
        synchronized (this) {
            if (snap != null) return snap;
            List<Dev> devices = deviceRepo.loadAll().stream().map(d -> new Dev(device(d), d.getId(), d.getKind(), new Span(d.getValidFrom(), d.getValidTo())))
                .sorted((a, b) -> Span.later(a.span, b.span)).toList();
            List<Sys> systems = systemRepo.loadAll().stream().map(x -> new Sys(x.getDevice().getId(),
                new DeskDto.System(x.getExternalKey(), x.getOs().name(), x.getAccent(), x.getLanguage(), x.getValidFrom(), x.getValidTo()),
                new Span(x.getValidFrom(), x.getValidTo()))).toList();
            List<Wall> walls = wallpaperRepo.loadAll().stream().map(w -> new Wall(w.getDevice().getId(), w.getPlace(), w.getExternalKey(),
                new DeskDto.Wallpaper(w.getMediaFile() == null ? null : storage.buildCdnUrl(w.getMediaFile().getStorageKey(), w.getMediaFile().getStorageProvider()),
                    w.getBuiltin(), w.getFit().name(), w.getColor()),
                Boolean.TRUE.equals(w.getIsDefault()), new Span(w.getValidFrom(), w.getValidTo()))).toList();
            List<Itm> items = itemRepo.loadAll().stream().map(i -> new Itm(i.getDevice() == null ? null : i.getDevice().getId(), i.getPlace(),
                new DeskDto.Item(i.getExternalKey(), i.getPlace().name(), i.getLabel(), i.getGlyph(), i.getApp(), i.getTarget(),
                    i.getSortOrder() == null ? 0 : i.getSortOrder()), new Span(i.getValidFrom(), i.getValidTo()))).toList();
            List<App> apps = appRepo.loadAll().stream().map(a -> new App(a.getDevice() == null ? null : a.getDevice().getId(), a.getApp(),
                a.getVersion(), new Span(a.getValidFrom(), a.getValidTo()))).toList();
            snap = new Snapshot(devices, systems, walls, items, apps);
            return snap;
        }
    }

    private DeskDto.Device device(DeskDevice d) {
        String photo = d.getPhoto() == null ? null : storage.buildCdnUrl(d.getPhoto().getStorageKey(), d.getPhoto().getStorageProvider());
        return new DeskDto.Device(d.getExternalKey(), d.getKind().name(), d.getName(), d.getModel(), photo, d.getScreenWidth(), d.getScreenHeight(),
            d.getValidFrom(), d.getValidTo(), d.isElsewhere());
    }

    // ── A moment ─────────────────────────────────────────────────────────────

    /** "at" as everywhere in the portal; nothing given = now. */
    public LocalDateTime at(String at) {
        return at == null || at.isBlank() ? LocalDateTime.now(ZoneOffset.UTC).withNano(0) : reads.at(at);
    }

    /** The moment at T, with the computer asked for (its key) when it is one he had at T — there were times he had two. */
    public DeskDto.Moment moment(LocalDateTime t, String computerKey) {
        Snapshot s = snap();
        DeskDto.Machine computer = machine(s, t, false, computerKey), phone = machine(s, t, true, null);
        return new DeskDto.Moment(t, computer, phone, day(t), s.devices.stream().map(Dev::dto).toList());
    }

    /** The computer (or phone) of T: the one asked for if its span covers T, else the one of his own whose span covers T
     *  (the later one when two do); before the first, the first. A machine that was elsewhere (the school's) is only
     *  ever the one asked for. */
    private DeskDto.Machine machine(Snapshot s, LocalDateTime t, boolean phone, String wanted) {
        List<Dev> mine = s.devices.stream().filter(d -> phone ? d.kind == DeskDevice.Kind.PHONE : d.kind != null && d.kind.computer()).toList();
        if (mine.isEmpty()) return null;
        Dev dev = null;
        for (Dev d : mine) if (d.span.covers(t) && !d.dto.elsewhere()) dev = d;   // sorted by start: the last that covers wins…
        if (wanted != null)                                            // …unless another one he had then is asked for
            for (Dev d : mine) if (d.dto.key().equals(wanted) && d.span.covers(t)) dev = d;
        if (dev == null) {                                             // in a gap or past the end: the last one he had…
            for (Dev d : mine) if (!d.dto.elsewhere() && (d.span.from == null || !d.span.from.isAfter(t))) dev = d;
            if (dev == null) {                                         // …before the first: the first computer, no phone yet
                if (phone) return null;
                dev = mine.stream().filter(d -> !d.dto.elsewhere()).findFirst().orElse(mine.get(0));
            }
        }
        UUID id = dev.id;
        boolean own = !dev.dto.elsewhere();                            // a machine that was not his has none of his things on it
        DeskDto.System sys = pick(s.systems.stream().filter(x -> x.device.equals(id)).toList(), Sys::span, t, x -> x.dto);
        DeskDto.Wallpaper wall = wallpaper(s, id, DeskWallpaper.Place.DESKTOP, t), lock = wallpaper(s, id, DeskWallpaper.Place.LOCK, t);
        List<DeskDto.Wallpaper> screen = screen(s, id, t);
        List<DeskDto.Item> items = s.items.stream()
            .filter(i -> i.span.covers(t) && (id.equals(i.device) || (own && i.device == null && PHONE_PLACES.contains(i.place) == phone)))
            .map(Itm::dto)
            .sorted(Comparator.comparing(DeskDto.Item::place).thenComparingInt(DeskDto.Item::sort).thenComparing(DeskDto.Item::label))
            .toList();
        Map<String, String> apps = new TreeMap<>();
        s.apps.stream().filter(a -> a.span.covers(t) && (a.device == null || a.device.equals(id)))
            .sorted(Comparator.comparing((App a) -> a.device != null).thenComparing((x, y) -> Span.later(x.span, y.span)))
            .forEach(a -> apps.put(a.app, a.version));                  // a device's own row beats a general one; later beats earlier
        Dev next = mine.stream().filter(d -> !d.dto.elsewhere() && d.span.from != null && d.span.from.isAfter(t)).findFirst().orElse(null);
        return new DeskDto.Machine(dev.dto, sys, wall, lock, screen, items, apps, next == null ? null : next.dto);
    }

    private DeskDto.Wallpaper wallpaper(Snapshot s, UUID device, DeskWallpaper.Place place, LocalDateTime t) {
        List<Wall> of = s.walls.stream().filter(w -> w.device.equals(device) && w.place == place).toList();
        Wall hit = null;                                               // a picture set for a period that covers T…
        for (Wall w : of) if (!w.isDefault && w.span.covers(t) && (hit == null || Span.later(hit.span, w.span) <= 0)) hit = w;
        if (hit != null) return hit.dto;
        return of.stream().filter(w -> w.isDefault).map(w -> w.dto).findFirst()   // …else the device's own default
            .orElseGet(() -> pick(of, Wall::span, t, w -> w.dto));
    }

    /** The screensaver's pictures at T, in key order: the ones set for a period that covers T, else the device's defaults. */
    private List<DeskDto.Wallpaper> screen(Snapshot s, UUID device, LocalDateTime t) {
        List<Wall> of = s.walls.stream().filter(w -> w.device.equals(device) && w.place == DeskWallpaper.Place.SCREEN)
            .sorted(Comparator.comparing(Wall::key)).toList();
        List<Wall> now = of.stream().filter(w -> !w.isDefault && w.span.covers(t)).toList();
        return (now.isEmpty() ? of.stream().filter(w -> w.isDefault).toList() : now).stream().map(Wall::dto).toList();
    }

    /** Of rows with spans, the one covering T that started last; failing that, the earliest row (a device's first setup). */
    private static <R, O> O pick(List<R> rows, java.util.function.Function<R, Span> span, LocalDateTime t, java.util.function.Function<R, O> out) {
        R best = null;
        for (R r : rows) if (span.apply(r).covers(t) && (best == null || Span.later(span.apply(best), span.apply(r)) <= 0)) best = r;
        if (best == null && !rows.isEmpty()) {
            R first = rows.stream().min((a, b) -> Span.later(span.apply(a), span.apply(b))).get();
            if (span.apply(first).from == null || span.apply(first).from.isAfter(t)) best = first;
        }
        return best == null ? null : out.apply(best);
    }

    // ── The day around T ─────────────────────────────────────────────────────

    private DeskDto.Day day(LocalDateTime t) {
        LocalDateTime dayStart = t.plusHours(7).toLocalDate().atStartOfDay().minusHours(7), dayEnd = dayStart.plusDays(1);
        List<DeskDto.Photo> photos = photos(dayStart, t, DAY_PHOTOS);
        if (photos.size() < 6) {                                     // a quiet day: the last photos before it fill the frame
            List<DeskDto.Photo> before = photos(dayStart.minusDays(90), dayStart.minusSeconds(1), DAY_PHOTOS - photos.size());
            photos = new ArrayList<>(photos);
            photos.addAll(before);
        }
        List<DeskDto.Memory> memories = episodeRepo.occurredBetween(dayStart, dayEnd).stream().map(DeskService::memory).toList();
        List<DeskDto.Toast> toasts = messageRepo.arrivedBy(t.minusMinutes(15), t, 4).stream().map(r -> new DeskDto.Toast(
            String.valueOf(r[1]), (UUID) r[0], (String) r[2], cut((String) r[3], 160), (String) r[4], SocialTime.fromDb(r[5]),
            r[6] == null ? null : ((Number) r[6]).intValue())).toList();
        return new DeskDto.Day(photos, memories, toasts);
    }

    /** Images taken in [from, to], newest first; Social Media pictures and assets are not part of the library. */
    private List<DeskDto.Photo> photos(LocalDateTime from, LocalDateTime to, int max) {
        if (max <= 0) return List.of();
        List<MediaFile> rows = em.createQuery("SELECT m FROM MediaFile m WHERE m.effectiveDate >= :a AND m.effectiveDate <= :b " +
                "AND m.fileType = com.sonic.angels.model.entity.MediaFile.FileType.IMAGE " +
                "AND (m.mediaCategory IS NULL OR m.mediaCategory NOT IN (com.sonic.angels.model.entity.MediaFile.MediaCategory.SOCIAL, com.sonic.angels.model.entity.MediaFile.MediaCategory.ASSET)) " +
                "ORDER BY m.effectiveDate DESC", MediaFile.class)
            .setParameter("a", from).setParameter("b", to).setMaxResults(max).getResultList();
        return rows.stream().map(this::photo).toList();
    }

    private DeskDto.Photo photo(MediaFile m) {
        return new DeskDto.Photo(m.getId(), storage.buildCdnUrl(m.getStorageKey(), m.getStorageProvider()), m.getWidth(), m.getHeight(),
            m.getEffectiveDate(), m.getCaption());
    }

    private static DeskDto.Memory memory(Episode e) {
        Person p = e.getPerson();
        return new DeskDto.Memory(e.getId(), e.getTitle(), cut(e.getSummary(), 400), e.getKind(), e.getOccurredAt(),
            e.getOccurredPrecision() == null ? null : e.getOccurredPrecision().name(), p == null ? null : p.getId(),
            p == null ? null : firstNonBlank(p.getDisplayName(), p.getName()), e.getPlace());
    }

    public DeskDto.MemoryPage memories(LocalDateTime t, String q, int page, int size) {
        String needle = q == null || q.isBlank() ? "" : "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
        Page<Episode> p = episodeRepo.upTo(t, needle, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        return new DeskDto.MemoryPage(p.getContent().stream().map(DeskService::memory).toList(), p.getNumber(), p.getTotalPages(), p.getTotalElements());
    }

    // ── A memory, opened where it happened ───────────────────────────────────

    /**
     * The moment of a memory and the windows that bring it back: the conversation at the line it quotes, the forum
     * post, the note, the photos, and the memory's own words on top. A quoted line pins the moment to the minute;
     * otherwise a memory known to the day (or month…) is read at the end of that span, so everything of it is there.
     */
    public DeskDto.Scene scene(UUID episodeId) {
        Episode e = episodeRepo.findById(episodeId).orElseThrow(() -> new ImportException(404, "no memory " + episodeId));
        List<EpisodeSource> sources = new ArrayList<>(e.getSources());
        sources.sort(Comparator.comparing(EpisodeSource::getSortOrder, Comparator.nullsLast(Comparator.naturalOrder())));
        LocalDateTime at = sources.stream().filter(s -> s.getKind() == EpisodeSource.Kind.CHAT && s.getSaidAt() != null)
            .map(EpisodeSource::getSaidAt).min(Comparator.naturalOrder()).orElse(null);
        if (at == null && e.getOccurredAt() != null) {
            // a memory known to the day (or month, year) is dated by the calendar of Vietnam: it opens at the end of that day
            DatePrecision p = e.getOccurredPrecision();
            at = p != null && p.ordinal() <= DatePrecision.DAY.ordinal() ? p.end(e.getOccurredAt()).minusHours(7).minusSeconds(1) : e.getOccurredAt();
        }
        if (at == null) throw new ImportException(400, "this memory has no time to go back to");
        List<DeskDto.Window> windows = new ArrayList<>();
        for (EpisodeSource s : sources) {
            switch (s.getKind()) {
                case CHAT -> {
                    ChatArchive a = s.getArchive();
                    if (a == null) continue;
                    Integer seq = s.getPosition();
                    if (seq == null && s.getSaidAt() != null)
                        seq = messageRepo.seqAtOrAfter(a.getId(), s.getSaidAt()).stream().findFirst().map(x -> ((Number) x).intValue()).orElse(null);
                    windows.add(new DeskDto.Window("chat", firstNonBlank(a.getTitle(), a.getCounterpart()), a.getPlatform().name(), a.getId(), seq,
                        null, null, null, null, null, s.getExcerpt()));
                }
                case FORUM -> { if (s.getThread() != null) windows.add(new DeskDto.Window("forum", s.getThread().getTitle(), null, null, null,
                    s.getThread().getId(), s.getPosition(), null, null, null, s.getExcerpt())); }
                case NOTE -> { if (s.getNote() != null) windows.add(new DeskDto.Window("word", s.getNote().getTitle(), null, null, null, null, null,
                    s.getNote().getId(), null, null, null)); }
                case LINK -> { if (s.getUrl() != null) windows.add(new DeskDto.Window("link", s.getUrl(), null, null, null, null, null, null,
                    s.getUrl(), null, s.getExcerpt())); }
            }
        }
        List<UUID> media = e.getMediaFiles().stream().map(MediaFile::getId).toList();
        if (!media.isEmpty()) windows.add(new DeskDto.Window("photos", e.getTitle(), null, null, null, null, null, null, null, media, null));
        windows.add(new DeskDto.Window("note", firstNonBlank(e.getTitle(), "Ký ức"), null, null, null, null, null, null, null, null, e.getSummary()));
        return new DeskDto.Scene(e.getId(), at, e.getTitle(), e.getSummary(), windows);
    }

    // ── Folders: the photo library as it stood at T ──────────────────────────

    private record Node(UUID id, String name, UUID parent, String coverUrl, LocalDateTime coverAt) {}
    private record FolderTree(Map<UUID, Node> nodes, Map<UUID, List<UUID>> children, Map<UUID, LocalDateTime> firstAt, UUID root, long builtAt) {}

    private FolderTree tree() {
        FolderTree ft = tree;
        if (ft != null && System.currentTimeMillis() - ft.builtAt < FOLDER_CACHE_MS) return ft;
        UUID root = collections.getRootId();
        Map<UUID, Node> nodes = new HashMap<>();
        Map<UUID, List<UUID>> children = new HashMap<>();
        Set<UUID> hidden = new HashSet<>();
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("SELECT c.id, c.name, c.parent_id, c.slug, t.storage_key, t.storage_provider, t.effective_date " +
            "FROM collections c LEFT JOIN media_files t ON t.id = c.thumbnail_media_file_id").getResultList();
        for (Object[] r : rows) {
            UUID id = (UUID) r[0], parent = (UUID) r[2];
            if (root.equals(parent) && CollectionService.hiddenSlug((String) r[3])) hidden.add(id);
            String cover = r[4] == null ? null : storage.buildCdnUrl((String) r[4], r[5] == null ? null : MediaFile.StorageProvider.valueOf(String.valueOf(r[5])));
            nodes.put(id, new Node(id, (String) r[1], parent, cover, SocialTime.fromDb(r[6])));
            if (parent != null) children.computeIfAbsent(parent, k -> new ArrayList<>()).add(id);
        }
        children.getOrDefault(root, new ArrayList<>()).removeAll(hidden);
        Map<UUID, LocalDateTime> direct = new HashMap<>();
        @SuppressWarnings("unchecked")
        List<Object[]> mins = em.createNativeQuery("SELECT cm.collection_id, MIN(m.effective_date) FROM collection_media cm " +
            "JOIN media_files m ON m.id = cm.media_file_id WHERE m.media_category IS NULL OR m.media_category NOT IN ('SOCIAL', 'ASSET') GROUP BY cm.collection_id").getResultList();
        for (Object[] r : mins) if (r[1] != null) direct.put((UUID) r[0], SocialTime.fromDb(r[1]));
        Map<UUID, LocalDateTime> first = new HashMap<>();
        firstOf(root, children, direct, first, new HashSet<>());
        ft = new FolderTree(nodes, children, first, root, System.currentTimeMillis());
        tree = ft;
        return ft;
    }

    /** The earliest file anywhere under a folder. */
    private static LocalDateTime firstOf(UUID id, Map<UUID, List<UUID>> children, Map<UUID, LocalDateTime> direct,
                                         Map<UUID, LocalDateTime> out, Set<UUID> seen) {
        if (!seen.add(id)) return out.get(id);
        LocalDateTime best = direct.get(id);
        for (UUID c : children.getOrDefault(id, List.of())) {
            LocalDateTime x = firstOf(c, children, direct, out, seen);
            if (x != null && (best == null || x.isBefore(best))) best = x;
        }
        if (best != null) out.put(id, best);
        return best;
    }

    public DeskDto.FolderPage folders(UUID parent, LocalDateTime t) {
        FolderTree ft = tree();
        UUID id = parent == null ? ft.root : parent;
        Node node = ft.nodes.get(id);
        if (node == null) throw new ImportException(404, "no folder " + id);
        List<DeskDto.Crumb> path = new ArrayList<>();
        for (Node n = node; n != null; n = n.parent == null ? null : ft.nodes.get(n.parent)) {
            path.add(0, new DeskDto.Crumb(n.id, n.name));
            if (n.id.equals(ft.root)) break;
        }
        List<UUID> kids = ft.children.getOrDefault(id, List.of()).stream()
            .filter(c -> ft.firstAt.get(c) != null && !ft.firstAt.get(c).isAfter(t)).toList();
        Map<UUID, Integer> counts = new HashMap<>();
        List<UUID> ask = new ArrayList<>(kids);
        ask.add(id);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("SELECT cm.collection_id, COUNT(*) FROM collection_media cm JOIN media_files m ON m.id = cm.media_file_id " +
                "WHERE cm.collection_id IN (:ids) AND m.effective_date <= :t AND (m.media_category IS NULL OR m.media_category NOT IN ('SOCIAL', 'ASSET')) GROUP BY cm.collection_id")
            .setParameter("ids", ask).setParameter("t", t).getResultList();
        for (Object[] r : rows) counts.put((UUID) r[0], ((Number) r[1]).intValue());
        List<DeskDto.Folder> out = kids.stream().map(c -> {
            Node n = ft.nodes.get(c);
            int sub = (int) ft.children.getOrDefault(c, List.of()).stream().filter(g -> ft.firstAt.get(g) != null && !ft.firstAt.get(g).isAfter(t)).count();
            String cover = n.coverAt != null && !n.coverAt.isAfter(t) ? n.coverUrl : null;
            return new DeskDto.Folder(c, n.name, counts.getOrDefault(c, 0), sub, cover, ft.firstAt.get(c));
        }).sorted(Comparator.comparing(DeskDto.Folder::name, String.CASE_INSENSITIVE_ORDER)).toList();
        return new DeskDto.FolderPage(id, id.equals(ft.root) ? "Pictures" : node.name, path, out, counts.getOrDefault(id, 0));
    }

    // ── Bits ─────────────────────────────────────────────────────────────────

    static String cut(String s, int max) { return s == null || s.length() <= max ? s : s.substring(0, max - 1) + "…"; }

    static String firstNonBlank(String... v) {
        for (String s : v) if (s != null && !s.isBlank()) return s.trim();
        return null;
    }

    /** Device ids by key, for the writer. */
    Map<String, UUID> deviceIds() {
        return snap().devices.stream().collect(Collectors.toMap(d -> d.dto.key(), d -> d.id));
    }
}
