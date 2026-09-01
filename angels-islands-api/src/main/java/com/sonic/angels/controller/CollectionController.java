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
    public List<CollectionDto.Response> findTopLevel(
        @RequestParam(defaultValue = "false") boolean inclChildrenCount,
        @RequestParam(defaultValue = "false") boolean inclMediaCount,
        @RequestParam(defaultValue = "false") boolean inclTags,
        @RequestParam(defaultValue = "false") boolean inclPersons) {
        return collectionService.findTopLevel(new CollectionService.Includes(inclChildrenCount, inclMediaCount, inclTags, inclPersons));
    }

    @GetMapping("/root")
    public CollectionDto.Response getRoot() { return collectionService.findResponseById(collectionService.getRootId()); }

    @GetMapping("/all")
    public List<CollectionDto.Response> findAll(
        @RequestParam(defaultValue = "false") boolean inclChildrenCount,
        @RequestParam(defaultValue = "false") boolean inclMediaCount,
        @RequestParam(defaultValue = "false") boolean inclTags,
        @RequestParam(defaultValue = "false") boolean inclPersons) {
        return collectionService.findAll(new CollectionService.Includes(inclChildrenCount, inclMediaCount, inclTags, inclPersons));
    }

    @GetMapping("/{id}")
    public CollectionDto.Response findById(@PathVariable UUID id) { return collectionService.findResponseById(id); }

    @GetMapping("/{id}/children")
    public List<CollectionDto.Response> findChildren(@PathVariable UUID id,
        @RequestParam(defaultValue = "false") boolean inclChildrenCount,
        @RequestParam(defaultValue = "false") boolean inclMediaCount,
        @RequestParam(defaultValue = "false") boolean inclTags,
        @RequestParam(defaultValue = "false") boolean inclPersons) {
        return collectionService.findByParentId(id, new CollectionService.Includes(inclChildrenCount, inclMediaCount, inclTags, inclPersons));
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
        @RequestParam(defaultValue = "desc") String sortDir,
        @RequestParam(defaultValue = "false") boolean inclDetails,
        @RequestParam(defaultValue = "false") boolean inclPersons,
        @RequestParam(defaultValue = "false") boolean inclTags) {
        return collectionService.getMedia(id, sort, sortDir, new MediaFileDto.Includes(inclDetails, inclPersons, inclTags));
    }

    @PostMapping("/{id}/media/{mediaId}")
    public ResponseEntity<Void> addMedia(@PathVariable UUID id, @PathVariable UUID mediaId) {
        collectionService.addMedia(id, mediaId); return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/media/batch")
    public java.util.Map<String, Integer> addMediaBatch(@PathVariable UUID id, @RequestBody List<UUID> mediaIds) {
        return java.util.Map.of("added", collectionService.addMediaBatch(id, mediaIds));
    }

    @DeleteMapping("/{id}/media/batch")
    public java.util.Map<String, Integer> removeMediaBatch(@PathVariable UUID id, @RequestBody List<UUID> mediaIds) {
        return java.util.Map.of("removed", collectionService.removeMediaBatch(id, mediaIds));
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
    public List<CollectionDto.Response> findByPerson(@PathVariable UUID personId,
        @RequestParam(defaultValue = "false") boolean inclChildrenCount,
        @RequestParam(defaultValue = "false") boolean inclMediaCount,
        @RequestParam(defaultValue = "false") boolean inclTags,
        @RequestParam(defaultValue = "false") boolean inclPersons) {
        return collectionService.findByPersonId(personId, new CollectionService.Includes(inclChildrenCount, inclMediaCount, inclTags, inclPersons));
    }
}
