package com.sonic.angels.controller;

import com.sonic.angels.model.dto.LifeEventDto;
import com.sonic.angels.service.LifeEventService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Events (sự kiện): a trip, a concert, the day a laptop was bought. personId defaults to the owner of the hub. */
@RestController
@RequestMapping("/api/events")
public class LifeEventController {

    private final LifeEventService events;

    public LifeEventController(LifeEventService events) { this.events = events; }

    @GetMapping
    public List<LifeEventDto.Summary> list(@RequestParam(required = false) UUID personId,
                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
                                           @RequestParam(required = false) String kind,
                                           @RequestParam(required = false) String q) {
        return events.list(personId, from, to, kind, q);
    }

    /** Where a moment falls: the events it is in, the last one before it, the next one. */
    @GetMapping("/at")
    public LifeEventDto.At at(@RequestParam(required = false) UUID personId,
                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime moment) {
        return events.at(personId, moment);
    }

    @GetMapping("/{id}")
    public LifeEventDto.Detail get(@PathVariable UUID id) { return events.detail(id); }

    @PostMapping
    public LifeEventDto.Detail create(@RequestBody LifeEventDto.Request r) { return events.create(r); }

    @PutMapping("/{id}")
    public LifeEventDto.Detail update(@PathVariable UUID id, @RequestBody LifeEventDto.Request r) { return events.update(id, r); }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) { events.delete(id); return ResponseEntity.noContent().build(); }

    /** All the events one importer keeps for a person, replaced at once (matched by externalKey). */
    @PutMapping("/sources/{source}")
    public Map<String, Object> replaceSource(@PathVariable String source, @RequestParam(required = false) UUID personId,
                                             @RequestBody List<LifeEventDto.Request> items) {
        return events.replaceSource(personId, source, items);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> bad(IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
}
