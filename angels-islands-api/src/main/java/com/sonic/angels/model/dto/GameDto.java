package com.sonic.angels.model.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** The game shelf ("Kệ game"): see {@link com.sonic.angels.model.entity.Game}. */
public class GameDto {

    // ── read ────────────────────────────────────────────────────────────────

    public record SeriesRef(String key, String name) {}

    /** A game as the shelf lists it. played = when he played it ("2007 – 2010"), devices = the machines he played it on. */
    public static class Card {
        public UUID id;
        public String key, title, kind, platform, developer, genre, versions, handName, coverUrl, iconUrl, basedOnKey, played;
        public Integer releaseYear, seriesOrder, handOrder;
        public boolean favorite;
        public SeriesRef series;
        /** first moment and first moment after his plays (none = not known when) */
        public LocalDateTime playFrom, playTo;
        public List<String> devices;
        /** plays on the portal page itself / plays inside a machine of its time */
        public boolean portal, machine;
        /** each stretch he played it: first moment, first moment after, the machine (for placing it in a period) */
        public List<Span> spans;
        /** something of his is on it (a play, a picture, a memory, a package, his list, his own game): false = only
         *  a line of its series, shown on the series page */
        public boolean mine;
    }

    public record Span(LocalDateTime from, LocalDateTime to, String device) {}

    public static class Play {
        public UUID id;
        public LocalDateTime startAt, endAt;
        public String precision, when, deviceKey, deviceName, via, version, evidence, note;
        public boolean approx;
    }

    /** A play that left a trace (a save, a score table, a settings file, his own words), with the game it belongs to. */
    public record Trace(String gameKey, String gameTitle, Play play) {}

    public static class Link {
        public UUID id;
        public String kind, title, url, note;
    }

    /** A picture of the game: the role it has here and the file as the media endpoints give it. */
    public static class Media {
        public UUID linkId;
        public String role, label;
        public MediaFileDto.Response media;
    }

    public record PersonRef(UUID id, String name, String avatarUrl) {}

    public static class Memory {
        public UUID id;
        public String title, summary, when, kind, coverUrl;
        public LocalDateTime occurredAt;
        public List<PersonRef> persons;
    }

    public static class NoteRef {
        public UUID id;
        public String title, slug, excerpt, kind, status;
        public LocalDateTime writtenAt;
    }

    /** What plays it (the file itself comes from /api/game-packages/{key}/file). */
    public static class Package {
        public UUID id;
        public String key, engine, title, fileName, saveFileName, config, note, gameKey, gameTitle;
        public Long fileSize, saveSize;
        public LocalDateTime saveAt;
        public boolean hasFile, hasSave, portal;
    }

    /** Where it plays inside the machines: a desk item (app game) on a device over a period. at = a moment to start
     *  that machine at (Vietnam wall-clock "2003-04-06T21:00"). */
    public static class Spot {
        public String packageKey, deviceKey, deviceName, label, at;
        public LocalDateTime from, to;
    }

    public static class Detail extends Card {
        public String summary, note;
        public Card basedOn;
        public List<Card> derived, seriesGames;
        public List<Play> plays;
        public List<Link> links;
        public List<Media> media;
        public List<Memory> memories;
        public List<NoteRef> notes;
        public List<Package> packages;
        public List<Spot> spots;
        public UUID coverMediaId, iconMediaId;
    }

    public static class Series {
        public UUID id;
        public String key, name, summary, coverUrl;
        public UUID coverMediaId;
        public Integer sortOrder;
        public List<Card> games;
    }

    // ── write ───────────────────────────────────────────────────────────────

    /** A game to create or update. Fields left out (null) keep what is there; a list given replaces what it covers:
     *  plays, links, memoryIds, noteIds entirely; media only his own pictures (SCREENSHOT, PHOTO, SCAN) — the shelf's
     *  files (MAP, ART, ICON) come and go through the assets endpoint. Empty strings clear text fields; the nil uuid
     *  clears a picture. */
    public static class GameIn {
        public String key, title, seriesKey, kind, basedOnKey, platform, developer, genre, versions, summary, note, handName;
        public Integer seriesOrder, releaseYear, handOrder;
        public Boolean favorite;
        public UUID coverMediaId, iconMediaId;
        public List<PlayIn> plays;
        public List<LinkIn> links;
        public List<MediaIn> media;
        public List<UUID> memoryIds, noteIds;
    }

    /** start: yyyy | yyyy-MM | yyyy-MM-dd | yyyy-MM-ddTHH:mm; precision defaults to its form; end = last day. device = a desk device key. */
    public static class PlayIn {
        public String start, precision, end, device, via, version, evidence, note;
        public Boolean approx;
    }

    public static class LinkIn {
        public String kind, title, url, note;
    }

    public static class MediaIn {
        public UUID mediaId;
        public String role, label;
    }

    public static class SeriesIn {
        public String key, name, summary;
        public UUID coverMediaId;
        public Integer sortOrder;
    }

    public static class PackageIn {
        public String key, gameKey, engine, title, config, note;
        public Boolean portal;
        public Integer sortOrder;
    }

    public static class Delete {
        public List<String> series, games, packages;
    }

    /** Everything an importer keeps, written at once (matched by key); source names it on what it creates. */
    public static class Sync {
        public String source;
        public List<SeriesIn> series;
        public List<GameIn> games;
        public List<PackageIn> packages;
        public Delete delete;
    }

    public record SyncResult(Map<String, Map<String, Integer>> counts, List<String> warnings) {}

    /** A file uploaded for a game (a map, the program's icon): its link. */
    public record AssetOut(UUID linkId, UUID mediaId, String url, String role, String label, boolean created) {}
}
