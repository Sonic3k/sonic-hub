package com.sonic.angels.controller;

import com.sonic.angels.model.dto.CollectionDto;
import com.sonic.angels.model.dto.MediaFileDto;
import com.sonic.angels.service.CollectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/collections")
public class CollectionController {

    private final CollectionService collectionService;

    public CollectionController(CollectionService collectionService) {
        this.collectionService = collectionService;
    }

    @GetMapping
    public List<CollectionDto.Response> findTopLevel() { return collectionService.findTopLevel(); }

    @GetMapping("/all")
    public List<CollectionDto.Response> findAll() { return collectionService.findAll(); }

    @GetMapping("/{id}")
    public CollectionDto.Response findById(@PathVariable UUID id) { return collectionService.findResponseById(id); }

    @GetMapping("/{id}/children")
    public List<CollectionDto.Response> findChildren(@PathVariable UUID id) {
        return collectionService.findByParentId(id);
    }

    @PostMapping
    public CollectionDto.Response create(@RequestBody CollectionDto.Request req) { return collectionService.create(req); }

    @PostMapping("/create-tree")
    public CollectionDto.TreeResponse createTree(@RequestBody CollectionDto.TreeRequest req) {
        return collectionService.createTree(req);
    }

    @PutMapping("/{id}")
    public CollectionDto.Response update(@PathVariable UUID id, @RequestBody CollectionDto.Request req) { return collectionService.update(id, req); }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) { collectionService.delete(id); return ResponseEntity.noContent().build(); }

    // ── Media ────────────────────────────────────────────────────────────────

    @GetMapping("/{id}/media")
    public List<MediaFileDto.Response> getMedia(@PathVariable UUID id,
        @RequestParam(defaultValue = "effectiveDate") String sort,
        @RequestParam(defaultValue = "desc") String sortDir) {
        return collectionService.getMedia(id, sort, sortDir);
    }

    @PostMapping("/{id}/media/{mediaId}")
    public ResponseEntity<Void> addMedia(@PathVariable UUID id, @PathVariable UUID mediaId) {
        collectionService.addMedia(id, mediaId); return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/media/{mediaId}")
    public ResponseEntity<Void> removeMedia(@PathVariable UUID id, @PathVariable UUID mediaId) {
        collectionService.removeMedia(id, mediaId); return ResponseEntity.ok().build();
    }

    // ── Thumbnail ────────────────────────────────────────────────────────────

    @PostMapping("/{id}/set-thumbnail/{mediaId}")
    public CollectionDto.Response setThumbnail(@PathVariable UUID id, @PathVariable UUID mediaId) {
        return collectionService.setThumbnail(id, mediaId);
    }

    // ── Breadcrumb ───────────────────────────────────────────────────────────

    @GetMapping("/{id}/breadcrumb")
    public List<CollectionDto.Response> getBreadcrumb(@PathVariable UUID id) {
        return collectionService.getBreadcrumb(id);
    }

    // ── By Person ────────────────────────────────────────────────────────────

    @GetMapping("/person/{personId}")
    public List<CollectionDto.Response> findByPerson(@PathVariable UUID personId) {
        return collectionService.findByPersonId(personId);
    }
}
