package com.sonic.hub.controller;

import com.sonic.hub.dto.EntryDto;
import com.sonic.hub.service.EntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/entries")
@RequiredArgsConstructor
public class EntryController {

    private final EntryService entryService;

    @GetMapping
    public List<EntryDto.Response> getByEntity(
            @RequestParam String entityType,
            @RequestParam UUID entityId) {
        return entryService.getByEntity(entityType, entityId);
    }

    @GetMapping("/recent")
    public List<EntryDto.Response> getRecent(@RequestParam(defaultValue = "7") int days) {
        return entryService.getRecent(days);
    }

    @GetMapping("/{id}")
    public EntryDto.Response getById(@PathVariable UUID id) {
        return entryService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EntryDto.Response create(@Valid @RequestBody EntryDto.Request request) {
        return entryService.create(request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        entryService.delete(id);
    }
}
