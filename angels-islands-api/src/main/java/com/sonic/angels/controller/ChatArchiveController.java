package com.sonic.angels.controller;

import com.sonic.angels.model.dto.ChatArchiveDto;
import com.sonic.angels.model.dto.ChatAttachmentDto;
import com.sonic.angels.model.entity.ChatAttachment;
import com.sonic.angels.model.entity.ChatArchive;
import com.sonic.angels.model.entity.ChatMessage;
import com.sonic.angels.repository.ChatArchiveRepository;
import com.sonic.angels.repository.ChatAttachmentRepository;
import com.sonic.angels.repository.ChatMessageRepository;
import com.sonic.angels.service.ChatImportService;
import com.sonic.angels.service.DtoMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/persons/{personId}/chat-archives")
public class ChatArchiveController {

    private final com.sonic.angels.service.ChatExtractionService extractionService;

    private final ChatArchiveRepository archiveRepo;
    private final ChatMessageRepository messageRepo;
    private final ChatAttachmentRepository attachmentRepo;
    private final ChatImportService importService;
    private final DtoMapper mapper;

    public ChatArchiveController(ChatArchiveRepository archiveRepo, ChatMessageRepository messageRepo,
                                 ChatAttachmentRepository attachmentRepo,
                                 ChatImportService importService, DtoMapper mapper,
                                 com.sonic.angels.service.ChatExtractionService extractionService) {
        this.archiveRepo = archiveRepo;
        this.messageRepo = messageRepo;
        this.attachmentRepo = attachmentRepo;
        this.importService = importService;
        this.mapper = mapper;
            this.extractionService = extractionService;
    }

    @GetMapping
    public List<ChatArchiveDto.Response> findByPerson(@PathVariable UUID personId) {
        return archiveRepo.findByPersonId(personId).stream().map(mapper::toChatArchiveResponse).toList();
    }

    /** Paged messages in original order; q filters by content for in-conversation search. */
    @GetMapping("/{archiveId}/messages")
    public org.springframework.data.domain.Page<ChatMessage> getMessages(
        @PathVariable UUID personId, @PathVariable UUID archiveId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "200") int size,
        @RequestParam(required = false) String q) {
        var pageable = org.springframework.data.domain.PageRequest.of(page, Math.min(size, 500),
            org.springframework.data.domain.Sort.by("seq").ascending());
        if (q != null && !q.isBlank())
            return messageRepo.findByChatArchiveIdAndContentContainingIgnoreCase(archiveId, q.trim(), pageable);
        return messageRepo.findVisibleByArchive(archiveId, ChatMessage.Kind.EMPTY, pageable);
    }

    /** Attachments of the messages the reader has on screen (?messageIds=a,b,c — at most 500). */
    @GetMapping("/{archiveId}/attachments")
    public ResponseEntity<List<ChatAttachmentDto.Item>> attachmentsOf(
        @PathVariable UUID personId, @PathVariable UUID archiveId,
        @RequestParam List<UUID> messageIds) {
        if (!archiveRepo.existsByIdAndPersonId(archiveId, personId)) return ResponseEntity.notFound().build();
        if (messageIds.size() > 500) return ResponseEntity.badRequest().build();
        if (messageIds.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(attachmentRepo.itemsOfMessages(archiveId, messageIds).stream().map(ChatAttachmentDto.Item::of).toList());
    }

    /** Every attachment of one archive for the gallery, paged; type = comma-separated (PHOTO,GIF), order = asc (conversation order) | desc. */
    @GetMapping("/{archiveId}/attachments/all")
    public ResponseEntity<org.springframework.data.domain.Page<ChatAttachmentDto.Item>> allAttachments(
        @PathVariable UUID personId, @PathVariable UUID archiveId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "60") int size,
        @RequestParam(required = false) String type,
        @RequestParam(defaultValue = "asc") String order) {
        if (!archiveRepo.existsByIdAndPersonId(archiveId, personId)) return ResponseEntity.notFound().build();
        Set<ChatAttachment.Type> types = EnumSet.noneOf(ChatAttachment.Type.class);
        if (type != null)
            Arrays.stream(type.split(",")).map(String::trim).map(String::toUpperCase).forEach(t -> {
                try { types.add(ChatAttachment.Type.valueOf(t)); } catch (IllegalArgumentException ignored) { }
            });
        if (types.isEmpty()) types.addAll(EnumSet.allOf(ChatAttachment.Type.class));
        var dir = "desc".equalsIgnoreCase(order) ? org.springframework.data.domain.Sort.Direction.DESC
                                                 : org.springframework.data.domain.Sort.Direction.ASC;
        var pageable = org.springframework.data.domain.PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
            org.springframework.data.jpa.domain.JpaSort.unsafe(dir, "m.seq", "a.id"));
        return ResponseEntity.ok(attachmentRepo.itemsOfArchive(archiveId, types, pageable).map(ChatAttachmentDto.Item::of));
    }

    @PostMapping("/import/yahoo")
    public ChatArchiveDto.ImportResult importYahoo(@PathVariable UUID personId,
                                                    @RequestParam("file") MultipartFile file) throws IOException {
        return importService.importYahooChat(personId, file);
    }

    @PostMapping("/{archiveId}/extract")
    public java.util.Map<String, String> extract(@PathVariable UUID personId, @PathVariable UUID archiveId) {
        ChatArchive archive = archiveRepo.findById(archiveId)
            .orElseThrow(() -> new RuntimeException("Archive not found"));
        if (archive.getExtractionStatus() == ChatArchive.ExtractionStatus.EXTRACTING)
            return java.util.Map.of("status", "ALREADY_EXTRACTING");
        if (!extractionService.isLlmConfigured())
            return java.util.Map.of("status", "NOT_CONFIGURED", "message", "Set ANTHROPIC_API_KEY on the service");
        extractionService.extractAsync(archiveId);
        return java.util.Map.of("status", "EXTRACTING");
    }

    @DeleteMapping("/{archiveId}")
    public ResponseEntity<Void> delete(@PathVariable UUID personId, @PathVariable UUID archiveId) {
        archiveRepo.deleteById(archiveId);
        return ResponseEntity.noContent().build();
    }
}
