package com.sonic.angels.controller;

import com.sonic.angels.model.dto.MediaFileDto;
import com.sonic.angels.service.MediaFileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/media-files")
public class MediaFileController {

    private final MediaFileService mediaFileService;
    private final com.sonic.angels.service.GeocodingService geocodingService;
    private final com.sonic.angels.service.CollectionService collectionService;

    public MediaFileController(MediaFileService mediaFileService,
                               com.sonic.angels.service.GeocodingService geocodingService,
                               com.sonic.angels.service.CollectionService collectionService) {
        this.mediaFileService = mediaFileService;
        this.geocodingService = geocodingService;
        this.collectionService = collectionService;
    }

    @PostMapping("/rescan-batch")
    public Map<String, Object> rescanBatch(@RequestParam(defaultValue = "20") int batchSize,
                                           @RequestParam(defaultValue = "false") boolean force) {
        return mediaFileService.rescanMetadataBatch(batchSize, force);
    }

    @PostMapping("/geocode-batch")
    public Map<String, Object> geocodeBatch(@RequestParam(defaultValue = "20") int batchSize,
                                            @RequestParam(defaultValue = "false") boolean force) {
        return geocodingService.geocodeBatch(batchSize, force);
    }

    @GetMapping
    public List<MediaFileDto.Response> findAll(
        @RequestParam(defaultValue = "false") boolean inclDetails,
        @RequestParam(defaultValue = "false") boolean inclPersons,
        @RequestParam(defaultValue = "false") boolean inclTags) {
        return mediaFileService.findAllDto(new MediaFileDto.Includes(inclDetails, inclPersons, inclTags));
    }

    @GetMapping("/library")
    public org.springframework.data.domain.Page<MediaFileDto.Response> library(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "100") int size,
        @RequestParam(required = false) Boolean favorite,
        @RequestParam(defaultValue = "false") boolean inclDetails,
        @RequestParam(defaultValue = "false") boolean inclPersons,
        @RequestParam(defaultValue = "false") boolean inclTags) {
        return mediaFileService.library(page, size, favorite, new MediaFileDto.Includes(inclDetails, inclPersons, inclTags));
    }

    @GetMapping("/geotagged")
    public List<MediaFileDto.Response> geotagged(
        @RequestParam(defaultValue = "false") boolean inclDetails,
        @RequestParam(defaultValue = "false") boolean inclPersons,
        @RequestParam(defaultValue = "false") boolean inclTags) {
        return mediaFileService.geotagged(new MediaFileDto.Includes(inclDetails, inclPersons, inclTags));
    }

    @GetMapping("/{id}")
    public MediaFileDto.Response findById(@PathVariable UUID id) { return mediaFileService.findDtoById(id); }

    @GetMapping("/person/{personId}")
    public List<MediaFileDto.Response> findByPerson(@PathVariable UUID personId,
        @RequestParam(defaultValue = "false") boolean inclDetails,
        @RequestParam(defaultValue = "false") boolean inclPersons,
        @RequestParam(defaultValue = "false") boolean inclTags) {
        return mediaFileService.findDtoByPersonId(personId, new MediaFileDto.Includes(inclDetails, inclPersons, inclTags));
    }

    @PostMapping("/upload")
    public MediaFileDto.Response upload(@RequestParam("file") MultipartFile file,
        @RequestParam(value = "personId", required = false) UUID personId,
        @RequestParam(value = "collectionId", required = false) UUID collectionId,
        @RequestParam(value = "subFolder", required = false) String subFolder,
        @RequestParam(value = "lastModified", required = false) Long lastModified) throws IOException {
        return mediaFileService.uploadAndReturn(file, personId, collectionId, subFolder, lastModified);
    }

    @PatchMapping("/{id}")
    public MediaFileDto.Response update(@PathVariable UUID id, @RequestBody MediaFileDto.UpdateRequest req) {
        return mediaFileService.updateMedia(id, req);
    }

    @PostMapping("/batch/favorite")
    public Map<String, Integer> favoriteBatch(@RequestBody MediaFileDto.FavoriteBatchRequest req) {
        int updated = mediaFileService.favoriteBatch(req.getIds(), req.isValue());
        return Map.of("updated", updated);
    }

    @PostMapping("/batch/move")
    public Map<String, Integer> moveBatch(@RequestBody MediaFileDto.MoveBatchRequest req) {
        return collectionService.moveMediaBatch(req.getFromCollectionId(), req.getToCollectionId(), req.getIds());
    }

    @PostMapping("/{id}/persons/{personId}")
    public MediaFileDto.Response addPerson(@PathVariable UUID id, @PathVariable UUID personId) {
        return mediaFileService.addPerson(id, personId);
    }

    @DeleteMapping("/{id}/persons/{personId}")
    public MediaFileDto.Response removePerson(@PathVariable UUID id, @PathVariable UUID personId) {
        return mediaFileService.removePerson(id, personId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) { mediaFileService.delete(id); return ResponseEntity.noContent().build(); }

    @PostMapping("/delete-batch")
    public ResponseEntity<Map<String, Integer>> deleteBatch(@RequestBody List<UUID> ids) {
        int deleted = mediaFileService.deleteBatch(ids);
        return ResponseEntity.ok(Map.of("deleted", deleted, "total", ids.size()));
    }
}
