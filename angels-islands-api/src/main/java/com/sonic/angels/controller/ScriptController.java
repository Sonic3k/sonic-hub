package com.sonic.angels.controller;

import com.sonic.angels.repository.MediaFileRepository;
import com.sonic.angels.service.MediaFileService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Isolated endpoints backing the admin Scripts page (mirrors the mushroom-hills pattern):
 * one POST per maintenance/migration script, each returning a summary map, all safe to re-run.
 * Heavy batch jobs (rescan-metadata, geocode) stay on /api/media-files — the Scripts page
 * drives them with batchSize/page/force.
 */
@RestController
@RequestMapping("/api/scripts")
public class ScriptController {

    private final MediaFileService mediaFileService;
    private final MediaFileRepository mediaFileRepository;

    public ScriptController(MediaFileService mediaFileService, MediaFileRepository mediaFileRepository) {
        this.mediaFileService = mediaFileService;
        this.mediaFileRepository = mediaFileRepository;
    }

    /** DB-only mediaSource backfill (fileName + stored EXIF) — no B2 downloads, instant. */
    @PostMapping("/backfill-media-source")
    public Map<String, Object> backfillMediaSource() {
        return mediaFileService.backfillMediaSource();
    }

    /** Derive file_extension from file_name for every row missing it — one native UPDATE, instant. */
    @PostMapping("/backfill-file-extension")
    public Map<String, Object> backfillFileExtension() {
        return mediaFileService.backfillFileExtension();
    }

    /** One-shot migration: NULL out the legacy 'ORIGINAL' default so null = unknown. */
    @PostMapping("/clear-original-source")
    @Transactional
    public Map<String, Object> clearOriginalSource() {
        int cleared = mediaFileRepository.clearOriginalSource();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("cleared", cleared);
        return out;
    }
}
