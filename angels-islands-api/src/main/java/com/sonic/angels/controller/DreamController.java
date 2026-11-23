package com.sonic.angels.controller;

import com.sonic.angels.model.dto.DreamDto;
import com.sonic.angels.service.DreamService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Dreams (giấc mơ): one record per dream, apart from memories — the dream as he told it, what it calls up in his
 *  waking life, who is in it, the real events it calls up. personId defaults to the owner of the hub. */
@RestController
@RequestMapping("/api/dreams")
public class DreamController {

    private final DreamService dreams;

    public DreamController(DreamService dreams) { this.dreams = dreams; }

    /** Newest morning first. A dream comes with its title and its opening (lead); its two texts, its people and its
     *  events only when asked: inclContent, inclPersons, inclEvents (a single dream always has them).
     *  from / to: days (yyyy-MM-dd), both kept. withPersonId: the dreams someone is in. eventId: the dreams that call
     *  up this event. q: words anywhere (marks optional), the best match first. */
    @GetMapping
    public List<DreamDto.Item> list(@RequestParam(required = false) UUID personId,
                                    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                    @RequestParam(required = false) UUID withPersonId,
                                    @RequestParam(required = false) UUID eventId,
                                    @RequestParam(required = false) String q,
                                    @RequestParam(defaultValue = "false") boolean inclContent,
                                    @RequestParam(defaultValue = "false") boolean inclPersons,
                                    @RequestParam(defaultValue = "false") boolean inclEvents) {
        return dreams.list(personId, from, to, withPersonId, eventId, q, new DreamDto.Includes(inclContent, inclPersons, inclEvents));
    }

    @GetMapping("/{id}")
    public DreamDto.Item get(@PathVariable UUID id) { return dreams.detail(id); }

    @PostMapping
    public DreamDto.Item create(@RequestBody DreamDto.Request r) { return dreams.create(r); }

    @PutMapping("/{id}")
    public DreamDto.Item update(@PathVariable UUID id, @RequestBody DreamDto.Request r) { return dreams.update(id, r); }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) { dreams.delete(id); return ResponseEntity.noContent().build(); }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> bad(IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
}
