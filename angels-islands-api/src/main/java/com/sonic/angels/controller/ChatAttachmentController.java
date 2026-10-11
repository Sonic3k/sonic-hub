package com.sonic.angels.controller;

import com.sonic.angels.service.ImportService;
import com.sonic.angels.service.StorageService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Streams a chat attachment's stored file (private: needs the admin token once one is configured). */
@RestController
@RequestMapping("/api/chat-attachments")
public class ChatAttachmentController {

    /** One range only ("bytes=0-", "bytes=100-199", "bytes=-500"); anything else gets the whole file. */
    private static final Pattern RANGE = Pattern.compile("^bytes=(\\d*)-(\\d*)$");

    private final ImportService importService;
    private final StorageService storage;

    public ChatAttachmentController(ImportService importService, StorageService storage) {
        this.importService = importService;
        this.storage = storage;
    }

    /** The file; honours a single HTTP Range (206) so <video>/<audio> can seek. */
    @GetMapping("/{id}/content")
    public ResponseEntity<InputStreamResource> content(@PathVariable UUID id,
                                                       @RequestHeader(value = HttpHeaders.RANGE, required = false) String range) {
        return importService.attachmentObject(id).map(o -> {
            MediaType type;
            try { type = MediaType.parseMediaType(o[1] != null ? o[1] : "application/octet-stream"); }
            catch (Exception e) { type = MediaType.APPLICATION_OCTET_STREAM; }
            Long size = o[3] != null ? Long.valueOf(o[3]) : null;
            String disposition = ContentDisposition.inline().filename(o[2], StandardCharsets.UTF_8).build().toString();

            long[] r = size != null ? range(range, size) : null;
            if (r != null && r.length == 0)
                return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    .header(HttpHeaders.CONTENT_RANGE, "bytes */" + size)
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .<InputStreamResource>build();
            if (r != null)
                return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                    .contentType(type)
                    .contentLength(r[1] - r[0] + 1)
                    .header(HttpHeaders.CONTENT_RANGE, "bytes " + r[0] + "-" + r[1] + "/" + size)
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                    .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400")
                    .body(new InputStreamResource(storage.downloadRange(o[0], r[0], r[1])));

            var ok = ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400");
            if (size != null) ok = ok.contentLength(size).header(HttpHeaders.ACCEPT_RANGES, "bytes");
            return ok.body(new InputStreamResource(storage.downloadStream(o[0])));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** [start, end] inclusive; null = no usable Range (send everything); empty = unsatisfiable (416). */
    static long[] range(String header, long size) {
        if (header == null) return null;
        Matcher m = RANGE.matcher(header.trim());
        if (!m.matches() || (m.group(1).isEmpty() && m.group(2).isEmpty())) return null;
        try {
            long start, end;
            if (m.group(1).isEmpty()) {               // suffix: the last N bytes
                long n = Long.parseLong(m.group(2));
                if (n == 0) return new long[0];
                start = Math.max(0, size - n); end = size - 1;
            } else {
                start = Long.parseLong(m.group(1));
                end = m.group(2).isEmpty() ? size - 1 : Math.min(Long.parseLong(m.group(2)), size - 1);
                if (end < start) return start >= size ? new long[0] : null;
            }
            if (start >= size) return new long[0];
            return new long[]{start, end};
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
