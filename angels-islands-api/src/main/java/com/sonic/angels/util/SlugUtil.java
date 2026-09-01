package com.sonic.angels.util;

import java.text.Normalizer;

public final class SlugUtil {

    private SlugUtil() {}

    /**
     * Slugify a name for storage paths: strip Vietnamese diacritics,
     * lowercase, keep only a-z 0-9 . _ - (chars outside this set broke the CDN).
     * "Hà Nội 2024" -> "ha-noi-2024"
     */
    public static String slugify(String input) {
        if (input == null || input.isBlank()) return "untitled";
        String s = input.replace('\u0111', 'd').replace('\u0110', 'D'); // đ/Đ not decomposed by NFD
        s = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        s = s.toLowerCase()
            .replaceAll("[^a-z0-9._-]+", "-")
            .replaceAll("-{2,}", "-")
            .replaceAll("^[-.]+|[-.]+$", "");
        return s.isBlank() ? "untitled" : s;
    }

    /** Slugify a file name, preserving its extension. "Ảnh Tết (1).JPG" -> "anh-tet-1.jpg" */
    public static String slugifyFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) return "file";
        int dot = fileName.lastIndexOf('.');
        String base = dot > 0 ? fileName.substring(0, dot) : fileName;
        String ext = dot > 0 && dot < fileName.length() - 1 ? fileName.substring(dot + 1) : "";
        return slugify(base) + (ext.isBlank() ? "" : "." + slugify(ext));
    }
}
