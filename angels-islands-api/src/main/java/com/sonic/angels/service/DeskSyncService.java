package com.sonic.angels.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonic.angels.model.dto.DeskDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import com.sonic.angels.util.SlugUtil;
import com.sonic.angels.util.SocialTime;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.lang.reflect.RecordComponent;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Writing the devices: one bundle of devices, systems, wallpapers, items and app versions, all or nothing, each row
 * upserted by its key (a key is made from what the row is about when none is given). A field left out of an item keeps
 * what is stored; a field sent as null clears it.
 */
@Service
public class DeskSyncService {

    /** What items may open; anything else is stored but flagged, since a misspelt app would open nothing. */
    public static final Set<String> APPS = Set.of("computer", "documents", "pictures", "explorer", "recycle", "network", "control",
        "browser", "yahoo", "skype", "messages", "zalo", "messenger", "facebook", "word", "notepad", "memories", "photos", "angels",
        "forum", "blog", "music", "games", "game", "link", "folder", "camera", "calendar", "clock", "settings", "none");

    private final DeskDeviceRepository deviceRepo;
    private final DeskSystemRepository systemRepo;
    private final DeskWallpaperRepository wallpaperRepo;
    private final DeskItemRepository itemRepo;
    private final DeskAppVersionRepository appRepo;
    private final MediaFileRepository mediaRepo;
    private final DeskService desk;
    private final ObjectMapper om;
    private final EntityManager em;

    public DeskSyncService(DeskDeviceRepository deviceRepo, DeskSystemRepository systemRepo, DeskWallpaperRepository wallpaperRepo,
                           DeskItemRepository itemRepo, DeskAppVersionRepository appRepo, MediaFileRepository mediaRepo,
                           DeskService desk, ObjectMapper om, EntityManager em) {
        this.deviceRepo = deviceRepo;
        this.systemRepo = systemRepo;
        this.wallpaperRepo = wallpaperRepo;
        this.itemRepo = itemRepo;
        this.appRepo = appRepo;
        this.mediaRepo = mediaRepo;
        this.desk = desk;
        this.om = om;
        this.em = em;
    }

    private record In<T>(T v, Set<String> has, String where) {
        boolean has(String f) { return has.contains(f); }
    }

    private static final class Ctx {
        final Map<String, Map<String, Integer>> counts = new LinkedHashMap<>();
        final List<String> warnings = new ArrayList<>();
        final Map<String, DeskDevice> devices = new HashMap<>();
        void count(String type, String what) { counts.computeIfAbsent(type, k -> new LinkedHashMap<>()).merge(what, 1, Integer::sum); }
    }

    @Transactional
    public DeskDto.SyncResult sync(JsonNode body) {
        if (body == null || !body.isObject()) throw new ImportException(400, "a JSON object is expected");
        Ctx c = new Ctx();
        Set<String> sections = Set.of("delete", "devices", "systems", "wallpapers", "items", "apps");
        body.fieldNames().forEachRemaining(f -> { if (!sections.contains(f)) c.warnings.add("unknown section \"" + f + "\" ignored"); });
        if (body.hasNonNull("delete")) deletes(read(body.get("delete"), DeskDto.DeleteIn.class, "delete", c).v(), c);
        List<In<DeskDto.DeviceIn>> devices = list(body, "devices", DeskDto.DeviceIn.class, c);
        List<In<DeskDto.SystemIn>> systems = list(body, "systems", DeskDto.SystemIn.class, c);
        List<In<DeskDto.WallpaperIn>> walls = list(body, "wallpapers", DeskDto.WallpaperIn.class, c);
        List<In<DeskDto.ItemIn>> items = list(body, "items", DeskDto.ItemIn.class, c);
        List<In<DeskDto.AppIn>> apps = list(body, "apps", DeskDto.AppIn.class, c);
        deviceRepo.findAll().forEach(d -> c.devices.put(d.getExternalKey(), d));
        for (In<DeskDto.DeviceIn> in : devices) device(in, c);
        for (In<DeskDto.SystemIn> in : systems) system(in, c);
        for (In<DeskDto.WallpaperIn> in : walls) wallpaper(in, c);
        for (In<DeskDto.ItemIn> in : items) item(in, c);
        for (In<DeskDto.AppIn> in : apps) app(in, c);
        em.flush();
        afterCommit();
        return new DeskDto.SyncResult(c.counts, c.warnings);
    }

    private void afterCommit() {
        if (TransactionSynchronizationManager.isSynchronizationActive())
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { desk.invalidate(); }
            });
        else desk.invalidate();
    }

    // ── Rows ─────────────────────────────────────────────────────────────────

    private void device(In<DeskDto.DeviceIn> it, Ctx c) {
        DeskDto.DeviceIn in = it.v();
        String w = it.where();
        if (blank(in.key())) throw new ImportException(400, w + ": key is required for a device");
        String key = in.key().trim();
        DeskDevice d = c.devices.get(key);
        boolean created = d == null;
        if (created) {
            if (blank(in.kind()) || blank(in.name())) throw new ImportException(400, w + ": kind and name are required for a new device");
            d = new DeskDevice();
            d.setExternalKey(key);
        }
        if (created || it.has("kind")) d.setKind(enumOf(DeskDevice.Kind.class, in.kind(), null, w + ".kind", true));
        if (created || it.has("name")) { if (blank(in.name())) throw new ImportException(400, w + ": name can't be empty"); d.setName(cut(in.name().trim(), 200)); }
        if (created || it.has("model")) d.setModel(cut(trim(in.model()), 200));
        if (created || it.has("photo")) d.setPhoto(media(in.photo(), w + ".photo"));
        if (created || it.has("screenWidth")) d.setScreenWidth(in.screenWidth());
        if (created || it.has("screenHeight")) d.setScreenHeight(in.screenHeight());
        if (created || it.has("from")) d.setValidFrom(time(in.from(), w + ".from"));
        if (created || it.has("to")) d.setValidTo(time(in.to(), w + ".to"));
        if (created || it.has("note")) d.setNote(cut(trim(in.note()), 2000));
        if (created || it.has("source")) d.setSource(SocialMediaService.source(in.source()));
        deviceRepo.save(d);
        c.devices.put(key, d);
        c.count("devices", created ? "created" : "updated");
    }

    private void system(In<DeskDto.SystemIn> it, Ctx c) {
        DeskDto.SystemIn in = it.v();
        String w = it.where();
        DeskDevice dev = device(in.device(), w, c, true);
        DeskSystem.Os os = enumOf(DeskSystem.Os.class, in.os(), null, w + ".os", false);
        String key = !blank(in.key()) ? in.key().trim()
            : dev.getExternalKey() + "/os/" + (os == null ? "_" : os.name()) + "/" + (blank(in.from()) ? "_" : in.from().trim());
        DeskSystem x = systemRepo.findByExternalKey(key).orElse(null);
        boolean created = x == null;
        if (created) {
            if (os == null) throw new ImportException(400, w + ": os is required");
            x = new DeskSystem();
            x.setExternalKey(cut(key, 200));
        }
        x.setDevice(dev);
        if (created || it.has("os")) { if (os == null) throw new ImportException(400, w + ": os can't be empty"); x.setOs(os); }
        if (created || it.has("accent")) x.setAccent(cut(trim(in.accent()), 16));
        if (created || it.has("language")) x.setLanguage(cut(trim(in.language()), 8));
        if (created || it.has("from")) x.setValidFrom(time(in.from(), w + ".from"));
        if (created || it.has("to")) x.setValidTo(time(in.to(), w + ".to"));
        if (created || it.has("note")) x.setNote(cut(trim(in.note()), 2000));
        if (created || it.has("source")) x.setSource(SocialMediaService.source(in.source()));
        systemRepo.save(x);
        c.count("systems", created ? "created" : "updated");
    }

    private void wallpaper(In<DeskDto.WallpaperIn> it, Ctx c) {
        DeskDto.WallpaperIn in = it.v();
        String w = it.where();
        DeskDevice dev = device(in.device(), w, c, true);
        DeskWallpaper.Place place = enumOf(DeskWallpaper.Place.class, in.place(), DeskWallpaper.Place.DESKTOP, w + ".place", false);
        String key = !blank(in.key()) ? in.key().trim() : dev.getExternalKey() + "/wall/" + place.name().toLowerCase(Locale.ROOT) + "/"
            + (Boolean.TRUE.equals(in.isDefault()) ? "default" : blank(in.from()) ? "_" : in.from().trim());
        DeskWallpaper x = wallpaperRepo.findByExternalKey(key).orElse(null);
        boolean created = x == null;
        if (created) {
            if (blank(in.media()) && blank(in.builtin())) throw new ImportException(400, w + ": media (a photo id) or builtin is required");
            x = new DeskWallpaper();
            x.setExternalKey(cut(key, 200));
        }
        x.setDevice(dev);
        if (created || it.has("place")) x.setPlace(place);
        if (created || it.has("media")) x.setMediaFile(media(in.media(), w + ".media"));
        if (created || it.has("builtin")) x.setBuiltin(cut(trim(in.builtin()), 60));
        if (created || it.has("fit")) x.setFit(enumOf(DeskWallpaper.Fit.class, in.fit(), DeskWallpaper.Fit.FILL, w + ".fit", false));
        if (created || it.has("color")) x.setColor(cut(trim(in.color()), 16));
        if (created || it.has("isDefault")) x.setIsDefault(in.isDefault());
        if (created || it.has("from")) x.setValidFrom(time(in.from(), w + ".from"));
        if (created || it.has("to")) x.setValidTo(time(in.to(), w + ".to"));
        if (created || it.has("note")) x.setNote(cut(trim(in.note()), 2000));
        if (created || it.has("source")) x.setSource(SocialMediaService.source(in.source()));
        if (x.getMediaFile() == null && blank(x.getBuiltin())) throw new ImportException(400, w + ": a wallpaper needs media or builtin");
        wallpaperRepo.save(x);
        c.count("wallpapers", created ? "created" : "updated");
    }

    private void item(In<DeskDto.ItemIn> it, Ctx c) {
        DeskDto.ItemIn in = it.v();
        String w = it.where();
        DeskDevice dev = device(in.device(), w, c, false);
        DeskItem.Place place = enumOf(DeskItem.Place.class, in.place(), null, w + ".place", false);
        String key = !blank(in.key()) ? in.key().trim() : (dev == null ? "any" : dev.getExternalKey()) + "/"
            + (place == null ? "_" : place.name().toLowerCase(Locale.ROOT)) + "/" + SlugUtil.slugify(firstNonBlank(in.label(), "item")) + "/"
            + (blank(in.from()) ? "_" : in.from().trim());
        DeskItem x = itemRepo.findByExternalKey(key).orElse(null);
        boolean created = x == null;
        if (created) {
            if (place == null || blank(in.label())) throw new ImportException(400, w + ": place and label are required");
            x = new DeskItem();
            x.setExternalKey(cut(key, 200));
        }
        if (created || it.has("device")) x.setDevice(dev);
        if (created || it.has("place")) { if (place == null) throw new ImportException(400, w + ": place can't be empty"); x.setPlace(place); }
        if (created || it.has("label")) { if (blank(in.label())) throw new ImportException(400, w + ": label can't be empty"); x.setLabel(cut(in.label().trim(), 200)); }
        if (created || it.has("glyph")) x.setGlyph(cut(trim(in.glyph()), 60));
        if (created || it.has("app")) {
            String app = trim(in.app());
            if (app != null && !APPS.contains(app)) c.warnings.add(w + ": app \"" + app + "\" is not one the devices know; it will open nothing");
            x.setApp(app == null ? null : cut(app, 60));
        }
        if (created || it.has("target")) x.setTarget(cut(trim(in.target()), 1000));
        if (created || it.has("sort")) x.setSortOrder(in.sort());
        if (created || it.has("from")) x.setValidFrom(time(in.from(), w + ".from"));
        if (created || it.has("to")) x.setValidTo(time(in.to(), w + ".to"));
        if (created || it.has("note")) x.setNote(cut(trim(in.note()), 2000));
        if (created || it.has("source")) x.setSource(SocialMediaService.source(in.source()));
        itemRepo.save(x);
        c.count("items", created ? "created" : "updated");
    }

    private void app(In<DeskDto.AppIn> it, Ctx c) {
        DeskDto.AppIn in = it.v();
        String w = it.where();
        DeskDevice dev = device(in.device(), w, c, false);
        if (blank(in.app()) || blank(in.version())) throw new ImportException(400, w + ": app and version are required");
        String key = !blank(in.key()) ? in.key().trim() : (dev == null ? "any" : dev.getExternalKey()) + "/app/" + in.app().trim() + "/" + in.version().trim();
        DeskAppVersion x = appRepo.findByExternalKey(key).orElse(null);
        boolean created = x == null;
        if (created) { x = new DeskAppVersion(); x.setExternalKey(cut(key, 200)); }
        x.setDevice(dev);
        x.setApp(cut(in.app().trim(), 60));
        x.setVersion(cut(in.version().trim(), 40));
        if (created || it.has("from")) x.setValidFrom(time(in.from(), w + ".from"));
        if (created || it.has("to")) x.setValidTo(time(in.to(), w + ".to"));
        if (created || it.has("note")) x.setNote(cut(trim(in.note()), 2000));
        if (created || it.has("source")) x.setSource(SocialMediaService.source(in.source()));
        appRepo.save(x);
        c.count("apps", created ? "created" : "updated");
    }

    // ── Deletes ──────────────────────────────────────────────────────────────

    private void deletes(DeskDto.DeleteIn d, Ctx c) {
        if (d == null) return;
        for (String k : nn(d.devices())) deleteOne("devices", k, c);
        for (String k : nn(d.systems())) deleteOne("systems", k, c);
        for (String k : nn(d.wallpapers())) deleteOne("wallpapers", k, c);
        for (String k : nn(d.items())) deleteOne("items", k, c);
        for (String k : nn(d.apps())) deleteOne("apps", k, c);
        em.flush();
    }

    @Transactional
    public void delete(String type, String key) {
        Ctx c = new Ctx();
        deleteOne(type, key, c);
        em.flush();
        afterCommit();
        if (c.counts.isEmpty()) throw new ImportException(404, "no " + type + " row with key " + key);
    }

    private void deleteOne(String type, String key, Ctx c) {
        if (blank(key)) return;
        String k = key.trim();
        Optional<?> row = switch (type) {
            case "devices" -> deviceRepo.findByExternalKey(k);
            case "systems" -> systemRepo.findByExternalKey(k);
            case "wallpapers" -> wallpaperRepo.findByExternalKey(k);
            case "items" -> itemRepo.findByExternalKey(k);
            case "apps" -> appRepo.findByExternalKey(k);
            default -> throw new ImportException(400, "type must be devices, systems, wallpapers, items or apps");
        };
        if (row.isEmpty()) { c.warnings.add(type + " " + k + ": nothing to delete"); return; }
        em.remove(row.get());
        c.count(type, "deleted");
    }

    // ── Reading back what is stored ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public DeskDto.Raw raw() {
        Function<DeskDevice, String> dk = d -> d == null ? null : d.getExternalKey();
        return new DeskDto.Raw(
            deviceRepo.loadAll().stream().sorted(Comparator.comparing(DeskDevice::getValidFrom, Comparator.nullsFirst(Comparator.naturalOrder())))
                .map(d -> new DeskDto.DeviceIn(d.getExternalKey(), d.getKind().name(), d.getName(), d.getModel(),
                    d.getPhoto() == null ? null : d.getPhoto().getId().toString(), d.getScreenWidth(), d.getScreenHeight(),
                    vn(d.getValidFrom()), vn(d.getValidTo()), d.getNote(), d.getSource().name())).toList(),
            systemRepo.loadAll().stream().map(x -> new DeskDto.SystemIn(x.getExternalKey(), dk.apply(x.getDevice()), x.getOs().name(), x.getAccent(),
                x.getLanguage(), vn(x.getValidFrom()), vn(x.getValidTo()), x.getNote(), x.getSource().name())).toList(),
            wallpaperRepo.loadAll().stream().map(x -> new DeskDto.WallpaperIn(x.getExternalKey(), dk.apply(x.getDevice()), x.getPlace().name(),
                x.getMediaFile() == null ? null : x.getMediaFile().getId().toString(), x.getBuiltin(), x.getFit().name(), x.getColor(),
                x.getIsDefault(), vn(x.getValidFrom()), vn(x.getValidTo()), x.getNote(), x.getSource().name())).toList(),
            itemRepo.loadAll().stream().sorted(Comparator.comparing(DeskItem::getExternalKey))
                .map(x -> new DeskDto.ItemIn(x.getExternalKey(), dk.apply(x.getDevice()), x.getPlace().name(), x.getLabel(), x.getGlyph(),
                    x.getApp(), x.getTarget(), x.getSortOrder(), vn(x.getValidFrom()), vn(x.getValidTo()), x.getNote(), x.getSource().name())).toList(),
            appRepo.loadAll().stream().map(x -> new DeskDto.AppIn(x.getExternalKey(), dk.apply(x.getDevice()), x.getApp(), x.getVersion(),
                vn(x.getValidFrom()), vn(x.getValidTo()), x.getNote(), x.getSource().name())).toList());
    }

    // ── Bits ─────────────────────────────────────────────────────────────────

    private DeskDevice device(String key, String where, Ctx c, boolean required) {
        if (blank(key)) {
            if (required) throw new ImportException(400, where + ": device (its key) is required");
            return null;
        }
        DeskDevice d = c.devices.get(key.trim());
        if (d == null) throw new ImportException(400, where + ": no device with key " + key.trim());
        return d;
    }

    private MediaFile media(String id, String where) {
        if (blank(id)) return null;
        try {
            UUID u = UUID.fromString(id.trim());
            return mediaRepo.findById(u).orElseThrow(() -> new ImportException(400, where + ": no photo with id " + u));
        } catch (IllegalArgumentException e) {
            throw new ImportException(400, where + ": a photo id (UUID) is expected");
        }
    }

    private <T> List<In<T>> list(JsonNode body, String field, Class<T> type, Ctx c) {
        JsonNode arr = body.get(field);
        if (arr == null || arr.isNull()) return List.of();
        if (!arr.isArray()) throw new ImportException(400, field + " must be a list");
        List<In<T>> out = new ArrayList<>(arr.size());
        for (int i = 0; i < arr.size(); i++) out.add(read(arr.get(i), type, field + "[" + i + "]", c));
        return out;
    }

    private <T> In<T> read(JsonNode n, Class<T> type, String where, Ctx c) {
        if (n == null || !n.isObject()) throw new ImportException(400, where + ": an object is expected");
        Set<String> has = new HashSet<>();
        n.fieldNames().forEachRemaining(has::add);
        if (type.isRecord()) {
            Set<String> known = Arrays.stream(type.getRecordComponents()).map(RecordComponent::getName).collect(Collectors.toSet());
            has.stream().filter(f -> !known.contains(f)).sorted().forEach(f -> c.warnings.add(where + ": unknown field \"" + f + "\" ignored"));
        }
        try {
            return new In<>(om.treeToValue(n, type), has, where);
        } catch (JsonProcessingException e) {
            throw new ImportException(400, where + ": " + e.getOriginalMessage());
        }
    }

    private static LocalDateTime time(String s, String where) {
        if (blank(s)) return null;
        try {
            return SocialTime.parse(s.trim()).utc();
        } catch (IllegalArgumentException e) {
            throw new ImportException(400, where + ": " + e.getMessage());
        }
    }

    private static String vn(LocalDateTime utc) {
        return utc == null ? null : utc.plusHours(7).toString();
    }

    private static <E extends Enum<E>> E enumOf(Class<E> type, String v, E dflt, String where, boolean required) {
        if (blank(v)) {
            if (required && dflt == null) throw new ImportException(400, where + " is required");
            return dflt;
        }
        try {
            return Enum.valueOf(type, v.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ImportException(400, where + ": must be one of " + Arrays.toString(type.getEnumConstants()));
        }
    }

    private static List<String> nn(List<String> l) { return l == null ? List.of() : l; }
    private static boolean blank(String s) { return s == null || s.isBlank(); }
    private static String trim(String s) { return blank(s) ? null : s.trim(); }
    private static String cut(String s, int max) { return s == null || s.length() <= max ? s : s.substring(0, max); }
    private static String firstNonBlank(String... v) { for (String s : v) if (!blank(s)) return s.trim(); return null; }
}
