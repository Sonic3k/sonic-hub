package com.sonic.angels.model.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The computer and the phone of a moment: which machine it was, what it ran, how it looked and what was on it, plus
 * the things of that day that show on its screen. Times are UTC like everywhere in the API; written ones (from/to)
 * are read like the social data: a bare date or time is Vietnam time.
 */
public final class DeskDto {
    private DeskDto() {}

    // ── Writing (POST /api/desk/sync) ────────────────────────────────────────

    /** kind = DESKTOP, LAPTOP or PHONE; photo = id of one of his photos of the machine. */
    public record DeviceIn(String key, String kind, String name, String model, String photo, Integer screenWidth, Integer screenHeight,
                           String from, String to, String note, String source) {}

    /** os = WIN98, WINXP, VISTA, WIN7, WIN81, WIN10, WIN11, NOKIA_S40, NOKIA_S60, IOS6, IOS7, IOS. */
    public record SystemIn(String key, String device, String os, String accent, String language, String from, String to,
                           String note, String source) {}

    /** place = DESKTOP (default) or LOCK; media = a photo id, or builtin = a picture drawn into the app. */
    public record WallpaperIn(String key, String device, String place, String media, String builtin, String fit, String color,
                              Boolean isDefault, String from, String to, String note, String source) {}

    /** No device = on every computer (or every phone for HOME / DOCK). */
    public record ItemIn(String key, String device, String place, String label, String glyph, String app, String target,
                         Integer sort, String from, String to, String note, String source) {}

    public record AppIn(String key, String device, String app, String version, String from, String to, String note, String source) {}

    public record DeleteIn(List<String> devices, List<String> systems, List<String> wallpapers, List<String> items, List<String> apps) {}

    public record SyncResult(Map<String, Map<String, Integer>> counts, List<String> warnings) {}

    /** Everything stored, in the shapes it is written in. */
    public record Raw(List<DeviceIn> devices, List<SystemIn> systems, List<WallpaperIn> wallpapers, List<ItemIn> items, List<AppIn> apps) {}

    // ── Reading ──────────────────────────────────────────────────────────────

    public record Device(String key, String kind, String name, String model, String photoUrl, Integer screenWidth, Integer screenHeight,
                         LocalDateTime from, LocalDateTime to) {}

    public record System(String key, String os, String accent, String language, LocalDateTime from, LocalDateTime to) {}

    public record Wallpaper(String url, String builtin, String fit, String color) {}

    public record Item(String key, String place, String label, String glyph, String app, String target, int sort) {}

    /** One machine as it was at T; next = the machine that comes after it (where the clock can jump). */
    public record Machine(Device device, System system, Wallpaper wallpaper, Wallpaper lock, List<Item> items,
                          Map<String, String> apps, Device next) {}

    public record Photo(UUID id, String url, Integer width, Integer height, LocalDateTime at, String caption) {}

    public record Memory(UUID id, String title, String summary, String kind, LocalDateTime at, String precision,
                         UUID personId, String personName, String place) {}

    /** A message that came in just before T, shown the way the app popped it up. */
    public record Toast(String platform, UUID archiveId, String sender, String text, String kind, LocalDateTime at, Integer seq) {}

    public record Day(List<Photo> photos, List<Memory> memories, List<Toast> toasts) {}

    public record Moment(LocalDateTime at, Machine computer, Machine phone, Day day, List<Device> machines) {}

    /**
     * A window to open for a memory. app: chat (platform + archiveId + seq), forum (threadId + post), word (noteId),
     * link (url), photos (mediaIds), note (title + text, the memory itself).
     */
    public record Window(String app, String title, String platform, UUID archiveId, Integer seq, UUID threadId, Integer post,
                         UUID noteId, String url, List<UUID> mediaIds, String text) {}

    public record Scene(UUID episode, LocalDateTime at, String title, String summary, List<Window> windows) {}

    public record MemoryPage(List<Memory> items, int page, int totalPages, long total) {}

    // ── Folders (the photo library as it stood at T) ─────────────────────────

    public record Crumb(UUID id, String name) {}

    /** count = files in the folder itself by T; folders = its subfolders that had anything by T. */
    public record Folder(UUID id, String name, int count, int folders, String coverUrl, LocalDateTime firstAt) {}

    public record FolderPage(UUID id, String name, List<Crumb> path, List<Folder> folders, int count) {}
}
