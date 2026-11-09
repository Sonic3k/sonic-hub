package com.sonic.angels.controller;

import com.sonic.angels.model.dto.ImportDto;
import com.sonic.angels.service.ChatMoveService;
import com.sonic.angels.service.ImportException;
import com.sonic.angels.service.ImportService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Bulk chat importer. Needs the admin token only when ADMIN_TOKEN is set (see AdminTokenFilter). */
@RestController
@RequestMapping("/api/import")
public class ImportController {

    private final ImportService importService;
    private final ChatMoveService moves;

    public ImportController(ImportService importService, ChatMoveService moves) {
        this.importService = importService;
        this.moves = moves;
    }

    @GetMapping("/status")
    public ImportDto.Status status() { return importService.status(); }

    @PostMapping("/persons")
    public List<ImportDto.PersonSyncResult> persons(@RequestBody List<ImportDto.PersonSync> body) {
        return importService.syncPersons(body);
    }

    @PostMapping("/archives")
    public ImportDto.ArchiveResult archive(@RequestBody ImportDto.ArchiveUpsert body) {
        return importService.upsertArchive(body);
    }

    @PostMapping("/archives/{archiveId}/messages")
    public ImportDto.MessageBatchResult messages(@PathVariable UUID archiveId, @RequestBody ImportDto.MessageBatch body) {
        return importService.upsertMessages(archiveId, body.getMessages());
    }

    @PostMapping("/archives/{archiveId}/finalize")
    public ImportDto.FinalizeResult finalizeArchive(@PathVariable UUID archiveId,
                                                    @RequestBody(required = false) ImportDto.FinalizeRequest body) {
        return importService.finalizeArchive(archiveId, body);
    }

    /** The rows of an archive as stored (EMPTY ones too), by seq: at most 2000 a call. */
    @GetMapping("/archives/{archiveId}/messages")
    public List<ImportDto.StoredMessage> stored(@PathVariable UUID archiveId, @RequestParam(defaultValue = "0") int fromSeq,
                                                @RequestParam(defaultValue = "2147483647") int toSeq,
                                                @RequestParam(defaultValue = "2000") int size) {
        return importService.stored(archiveId, fromSeq, toSeq, size);
    }

    /** Move messages (by seq) into the conversation they belong to: another nick's chat, or a conference of its own. */
    @PostMapping("/archives/{archiveId}/move")
    public ImportDto.MoveResult move(@PathVariable UUID archiveId, @RequestBody ImportDto.MoveRequest body) {
        return moves.move(archiveId, body);
    }

    /** Put messages of an archive in another order: old seq → new seq; links to them follow. */
    @PostMapping("/archives/{archiveId}/reseq")
    public ImportDto.ReseqResult reseq(@PathVariable UUID archiveId, @RequestBody ImportDto.ReseqRequest body) {
        return moves.reseq(archiveId, body);
    }

    @DeleteMapping("/archives/{archiveId}")
    public Map<String, Object> deleteArchive(@PathVariable UUID archiveId) {
        return Map.of("archiveId", archiveId, "deletedMessages", importService.deleteArchive(archiveId));
    }

    /** Writings by the angels and other friends, kept as journal notes with their author. */
    @PostMapping("/writings")
    public List<ImportDto.WritingResult> writings(@RequestBody List<ImportDto.WritingIn> body,
                                                  @RequestParam(defaultValue = "false") boolean overwrite) {
        return importService.importWritings(body, overwrite);
    }

    @PostMapping("/raw/check")
    public List<ImportDto.RawCheckResult> rawCheck(@RequestBody List<ImportDto.RawFileRef> body) {
        return importService.checkRaw(body);
    }

    @PostMapping(value = "/raw", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportDto.RawUploadResult raw(@RequestParam("label") String label, @RequestParam("path") String path,
                                         @RequestParam("sha256") String sha256,
                                         @RequestParam("file") MultipartFile file) throws IOException {
        return importService.uploadRaw(label, path, sha256, file);
    }

    @ExceptionHandler(ImportException.class)
    public ResponseEntity<Map<String, String>> importError(ImportException e) {
        return ResponseEntity.status(e.getStatus()).body(Map.of("error", e.getMessage()));
    }
}
