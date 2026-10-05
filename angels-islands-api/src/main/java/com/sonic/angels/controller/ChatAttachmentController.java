package com.sonic.angels.controller;

import com.sonic.angels.service.ImportService;
import com.sonic.angels.service.StorageService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/** Streams a chat attachment's stored file (private: needs the admin token once one is configured). */
@RestController
@RequestMapping("/api/chat-attachments")
public class ChatAttachmentController {

    private final ImportService importService;
    private final StorageService storage;

    public ChatAttachmentController(ImportService importService, StorageService storage) {
        this.importService = importService;
        this.storage = storage;
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<InputStreamResource> content(@PathVariable UUID id) {
        return importService.attachmentObject(id).map(o -> {
            MediaType type;
            try { type = MediaType.parseMediaType(o[1] != null ? o[1] : "application/octet-stream"); }
            catch (Exception e) { type = MediaType.APPLICATION_OCTET_STREAM; }
            return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                    ContentDisposition.inline().filename(o[2], StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400")
                .body(new InputStreamResource(storage.downloadStream(o[0])));
        }).orElse(ResponseEntity.notFound().build());
    }
}
