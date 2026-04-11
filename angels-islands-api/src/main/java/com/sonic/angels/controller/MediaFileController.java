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

    public MediaFileController(MediaFileService mediaFileService) {
        this.mediaFileService = mediaFileService;
    }

    @GetMapping
    public List<MediaFileDto.Response> findAll() { return mediaFileService.findAllDto(); }

    @GetMapping("/{id}")
    public MediaFileDto.Response findById(@PathVariable UUID id) { return mediaFileService.findDtoById(id); }

    @GetMapping("/person/{personId}")
    public List<MediaFileDto.Response> findByPerson(@PathVariable UUID personId) { return mediaFileService.findDtoByPersonId(personId); }

    @PostMapping("/upload")
    public MediaFileDto.Response upload(@RequestParam("file") MultipartFile file,
        @RequestParam(value = "personId", required = false) UUID personId,
        @RequestParam(value = "subFolder", required = false) String subFolder,
        @RequestParam(value = "lastModified", required = false) Long lastModified) throws IOException {
        return mediaFileService.uploadAndReturn(file, personId, subFolder, lastModified);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) { mediaFileService.delete(id); return ResponseEntity.noContent().build(); }

    @PostMapping("/delete-batch")
    public ResponseEntity<Map<String, Integer>> deleteBatch(@RequestBody List<UUID> ids) {
        int deleted = mediaFileService.deleteBatch(ids);
        return ResponseEntity.ok(Map.of("deleted", deleted, "total", ids.size()));
    }
}
