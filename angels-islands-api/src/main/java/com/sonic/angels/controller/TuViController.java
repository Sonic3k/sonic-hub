package com.sonic.angels.controller;

import com.sonic.angels.model.dto.TuViDto;
import com.sonic.angels.service.TuViService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

/** Tử vi (Huyền học): saved birth profiles and Claude's readings of their charts; the chart itself is drawn by the web. */
@RestController
public class TuViController {

    private final TuViService tuViService;

    public TuViController(TuViService tuViService) { this.tuViService = tuViService; }

    @GetMapping("/api/tuvi/profiles")
    public List<TuViDto.Profile> profiles() { return tuViService.list(); }

    @GetMapping("/api/tuvi/profiles/{id}")
    public TuViDto.Profile profile(@PathVariable UUID id) { return tuViService.get(id); }

    @PostMapping("/api/tuvi/profiles")
    public TuViDto.Profile create(@RequestBody TuViDto.ProfileInput in) { return tuViService.create(in); }

    @PutMapping("/api/tuvi/profiles/{id}")
    public TuViDto.Profile update(@PathVariable UUID id, @RequestBody TuViDto.ProfileInput in) { return tuViService.update(id, in); }

    /** The profile and all its readings. */
    @DeleteMapping("/api/tuvi/profiles/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) { tuViService.delete(id); return ResponseEntity.noContent().build(); }

    @GetMapping("/api/tuvi/profiles/{id}/readings")
    public List<TuViDto.Reading> readings(@PathVariable UUID id) { return tuViService.readings(id); }

    /** Claude writes the reading (a minute or more); stored only when profileId is given. */
    @PostMapping("/api/tuvi/readings")
    public TuViDto.Reading generate(@RequestBody TuViDto.ReadingRequest req) { return tuViService.generate(req); }

    @DeleteMapping("/api/tuvi/readings/{id}")
    public ResponseEntity<Void> deleteReading(@PathVariable UUID id) { tuViService.deleteReading(id); return ResponseEntity.noContent().build(); }

    @GetMapping("/api/tuvi/status")
    public TuViDto.Status status() { return tuViService.status(); }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("error", e.getMessage())); }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> bad(IllegalArgumentException e) { return ResponseEntity.status(400).body(Map.of("error", e.getMessage())); }

    /** No ANTHROPIC_API_KEY, the model could not be reached, or it kept answering in the wrong shape. */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> unavailable(IllegalStateException e) { return ResponseEntity.status(503).body(Map.of("error", e.getMessage())); }
}
