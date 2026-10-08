package com.sonic.angels.controller;

import com.sonic.angels.model.dto.CollectionDto;
import com.sonic.angels.model.dto.MediaFileDto;
import com.sonic.angels.service.CollectionDeleteService;
import com.sonic.angels.service.CollectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/collections")
public class CollectionController {

    private final CollectionService collectionService;
    private final CollectionDeleteService collectionDeleteService;

    private final com.sonic.angels.repository.CollectionRepository collectionRepository;

    public CollectionController(CollectionService collectionService, CollectionDeleteService collectionDeleteService,
                                com.sonic.angels.repository.CollectionRepository collectionRepository) {
        this.collectionService = collectionService;
        this.collectionDeleteService = collectionDeleteService;
        this.collectionRepository = collectionRepository;
    }

    /** How many photos in the album (and sub-albums when deep) carry each tag. */
    @GetMapping("/{id}/tag-stats")
    public java.util.Map<String, Object> tagStats(@PathVariable UUID id, @RequestParam(defaultValue = "true") boolean deep) {
        long total = collectionRepository.countMediaInTree(id, deep);
        List<java.util.Map<String, Object>> tags = collectionRepository.tagCountsInTree(id, deep).stream()
            .map(r -> java.util.Map.<String, Object>of("tagId", r[0], "count", ((Number) r[1]).longValue())).toList();
        return java.util.Map.of("total", total, "tags", tags);
    }

    /** Tag every photo in the album; the album itself carries the tag too. */
    @PostMapping("/{id}/media-tags/{tagId}")
    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Object> tagAllMedia(@PathVariable UUID id, @PathVariable UUID tagId, @RequestParam(defaultValue = "true") boolean deep) {
        int n = collectionRepository.tagAllMedia(id, deep, tagId);
        collectionRepository.addAlbumTag(id, tagId);
        return java.util.Map.of("affected", n);
    }

    /** Remove the tag from every photo in the album, and from the album. */
    @DeleteMapping("/{id}/media-tags/{tagId}")
    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Object> untagAllMedia(@PathVariable UUID id, @PathVariable UUID tagId, @RequestParam(defaultValue = "true") boolean deep) {
        int n = collectionRepository.untagAllMedia(id, deep, tagId);
        collectionRepository.removeAlbumTag(id, tagId);
        return java.util.Map.of("affected", n);
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

    /** What "delete with photos" would do: albums, photos to delete, photos kept and why. Changes nothing. */
    @GetMapping("/{id}/delete-preview")
    public CollectionDeleteService.Preview deletePreview(@PathVariable UUID id) { return collectionDeleteService.preview(id); }

    /** withMedia=false: the album and its sub-albums go, their photos stay in the library.
     *  withMedia=true: their photos go too (database, then B2) — except photos that are also in albums outside
     *  this one, or in use as an avatar / cover / banner / journal cover: those are only taken out. */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id, @RequestParam(defaultValue = "false") boolean withMedia) {
        if (withMedia) return ResponseEntity.ok(collectionDeleteService.deleteWithMedia(id));
        collectionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(CollectionDeleteService.Refused.class)
    public ResponseEntity<java.util.Map<String, String>> deleteRefused(CollectionDeleteService.Refused e) {
        return ResponseEntity.status(e.status()).body(java.util.Map.of("error", e.getMessage()));
    }

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
