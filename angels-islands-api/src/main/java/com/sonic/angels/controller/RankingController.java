package com.sonic.angels.controller;

import com.sonic.angels.model.dto.RankingDto;
import com.sonic.angels.service.RankingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

/** Ranked lists over time (relationship sheets, fb association, Moments, chat activity). */
@RestController
public class RankingController {

    private final RankingService rankingService;

    public RankingController(RankingService rankingService) { this.rankingService = rankingService; }

    @GetMapping("/api/rankings")
    public List<RankingDto.Summary> list(@RequestParam(required = false) String board) { return rankingService.list(board); }

    @GetMapping("/api/rankings/{id}")
    public RankingDto.Detail get(@PathVariable UUID id) { return rankingService.get(id); }

    @GetMapping("/api/persons/{personId}/rankings")
    public List<RankingDto.PersonEntry> forPerson(@PathVariable UUID personId) { return rankingService.forPerson(personId); }

    /** Create or replace one list — the import script calls this once per list. */
    @PutMapping("/api/rankings")
    public RankingDto.Summary upsert(@RequestBody RankingDto.Import req) { return rankingService.upsert(req); }

    @DeleteMapping("/api/rankings/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) { rankingService.delete(id); return ResponseEntity.noContent().build(); }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("error", e.getMessage())); }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> bad(IllegalArgumentException e) { return ResponseEntity.status(400).body(Map.of("error", e.getMessage())); }
}
