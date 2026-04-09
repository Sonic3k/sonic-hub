package com.sonic.angels.controller;

import com.sonic.angels.model.dto.CollectionDto;
import com.sonic.angels.model.dto.MediaFileDto;
import com.sonic.angels.service.CollectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/collections")
public class CollectionController {

    private final CollectionService collectionService;

    public CollectionController(CollectionService collectionService) {
        this.collectionService = collectionService;
    }

    @GetMapping
    public List<CollectionDto.Response> findAll() { return collectionService.findAll(); }

    @GetMapping("/roots")
    public List<CollectionDto.Response> findRoots() { return collectionService.findRoots(); }

    @GetMapping("/{id}")
    public CollectionDto.Response findById(@PathVariable Long id) { return collectionService.findResponseById(id); }

    @GetMapping("/{id}/children")
    public List<CollectionDto.Response> findChildren(@PathVariable Long id) {
        return collectionService.findByParentId(id);
    }

    @PostMapping
    public CollectionDto.Response create(@RequestBody CollectionDto.Request req) { return collectionService.create(req); }

    @PutMapping("/{id}")
    public CollectionDto.Response update(@PathVariable Long id, @RequestBody CollectionDto.Request req) { return collectionService.update(id, req); }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { collectionService.delete(id); return ResponseEntity.noContent().build(); }

    // ── Media ────────────────────────────────────────────────────────────────

    @GetMapping("/{id}/media")
    public List<MediaFileDto.Response> getMedia(@PathVariable Long id) { return collectionService.getMedia(id); }

    @PostMapping("/{id}/media/{mediaId}")
    public ResponseEntity<Void> addMedia(@PathVariable Long id, @PathVariable Long mediaId) {
        collectionService.addMedia(id, mediaId); return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/media/{mediaId}")
    public ResponseEntity<Void> removeMedia(@PathVariable Long id, @PathVariable Long mediaId) {
        collectionService.removeMedia(id, mediaId); return ResponseEntity.ok().build();
    }

    // ── Thumbnail ────────────────────────────────────────────────────────────

    @PostMapping("/{id}/set-thumbnail/{mediaId}")
    public CollectionDto.Response setThumbnail(@PathVariable Long id, @PathVariable Long mediaId) {
        return collectionService.setThumbnail(id, mediaId);
    }

    // ── Breadcrumb ───────────────────────────────────────────────────────────

    @GetMapping("/{id}/breadcrumb")
    public List<CollectionDto.Response> getBreadcrumb(@PathVariable Long id) {
        return collectionService.getBreadcrumb(id);
    }

    // ── By Person ────────────────────────────────────────────────────────────

    @GetMapping("/person/{personId}")
    public List<CollectionDto.Response> findByPerson(@PathVariable Long personId) {
        return collectionService.findByPersonId(personId);
    }
}
