package com.sonic.angels.controller;

import com.sonic.angels.model.dto.ChatArchiveDto;
import com.sonic.angels.model.entity.ChatArchive;
import com.sonic.angels.model.entity.ChatMessage;
import com.sonic.angels.repository.ChatArchiveRepository;
import com.sonic.angels.repository.ChatMessageRepository;
import com.sonic.angels.service.ChatImportService;
import com.sonic.angels.service.DtoMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/persons/{personId}/chat-archives")
public class ChatArchiveController {

    private final com.sonic.angels.service.ChatExtractionService extractionService;

    private final ChatArchiveRepository archiveRepo;
    private final ChatMessageRepository messageRepo;
    private final ChatImportService importService;
    private final DtoMapper mapper;

    public ChatArchiveController(ChatArchiveRepository archiveRepo, ChatMessageRepository messageRepo,
                                 ChatImportService importService, DtoMapper mapper,
                                 com.sonic.angels.service.ChatExtractionService extractionService) {
        this.archiveRepo = archiveRepo;
        this.messageRepo = messageRepo;
        this.importService = importService;
        this.mapper = mapper;
            this.extractionService = extractionService;
    }

    @GetMapping
    public List<ChatArchiveDto.Response> findByPerson(@PathVariable UUID personId) {
        return archiveRepo.findByPersonId(personId).stream().map(mapper::toChatArchiveResponse).toList();
    }

    @GetMapping("/{archiveId}/messages")
    public List<ChatMessage> getMessages(@PathVariable UUID personId, @PathVariable UUID archiveId) {
        return messageRepo.findByChatArchiveIdOrderBySeqAsc(archiveId);
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
