package com.sonic.angels.util;

import net.iakovlev.timeshape.TimeZoneEngine;

import java.time.ZoneId;
import java.util.Optional;

/**
 * Resolves the IANA timezone of a photo/video from its GPS coordinates using an offline
 * polygon dataset (TimeShape). The engine is initialized lazily and bounded to Asia to keep
 * memory low on Railway. Falls back to Vietnam when there are no coordinates, the point is
 * outside the loaded region, or anything fails — so this never throws and never blocks an upload.
 */
public final class TimezoneResolver {

    public static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    // Asia bounding box (minLat, minLng, maxLat, maxLng) — covers VN, China, Japan, Korea,
    // India, SE Asia, Indonesia. Points outside fall back to DEFAULT_ZONE.
    private static final double MIN_LAT = -12.0, MIN_LNG = 58.0, MAX_LAT = 56.0, MAX_LNG = 155.0;

    private static volatile TimeZoneEngine engine;
    private static volatile boolean initFailed = false;

    private TimezoneResolver() {}

    /** Returns the timezone for the given coordinates, or Vietnam when unknown/unavailable. */
    public static ZoneId resolve(Double lat, Double lng) {
        if (lat == null || lng == null) return DEFAULT_ZONE;
        if (lat == 0.0 && lng == 0.0) return DEFAULT_ZONE; // "no GPS fix" sentinel
        try {
            TimeZoneEngine e = engineOrInit();
            if (e == null) return DEFAULT_ZONE;
            Optional<ZoneId> z = e.query(lat, lng);
            return z.orElse(DEFAULT_ZONE);
        } catch (Throwable t) {
            return DEFAULT_ZONE;
        }
    }

    private static TimeZoneEngine engineOrInit() {
        if (engine != null) return engine;
        if (initFailed) return null;
        synchronized (TimezoneResolver.class) {
            if (engine != null) return engine;
            if (initFailed) return null;
            try {
                // 5-arg overload (2020d.11); accelerateGeometry=false → lower memory, queries are rare
                engine = TimeZoneEngine.initialize(MIN_LAT, MIN_LNG, MAX_LAT, MAX_LNG, false);
            } catch (Throwable t) {
                initFailed = true;
            }
            return engine;
        }
    }
}
