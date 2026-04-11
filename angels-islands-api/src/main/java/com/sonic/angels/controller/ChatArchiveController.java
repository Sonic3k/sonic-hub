package com.sonic.angels.controller;

import com.sonic.angels.model.dto.ChatArchiveDto;
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

    private final ChatArchiveRepository archiveRepo;
    private final ChatMessageRepository messageRepo;
    private final ChatImportService importService;
    private final DtoMapper mapper;

    public ChatArchiveController(ChatArchiveRepository archiveRepo, ChatMessageRepository messageRepo,
                                 ChatImportService importService, DtoMapper mapper) {
        this.archiveRepo = archiveRepo;
        this.messageRepo = messageRepo;
        this.importService = importService;
        this.mapper = mapper;
    }

    @GetMapping
    public List<ChatArchiveDto.Response> findByPerson(@PathVariable UUID personId) {
        return archiveRepo.findByPersonId(personId).stream().map(mapper::toChatArchiveResponse).toList();
    }

    @GetMapping("/{archiveId}/messages")
    public List<ChatMessage> getMessages(@PathVariable UUID personId, @PathVariable UUID archiveId) {
        return messageRepo.findByChatArchiveIdOrderByTimestampAsc(archiveId);
    }

    @PostMapping("/import/yahoo")
    public ChatArchiveDto.ImportResult importYahoo(@PathVariable UUID personId,
                                                    @RequestParam("file") MultipartFile file) throws IOException {
        return importService.importYahooChat(personId, file);
    }

    @DeleteMapping("/{archiveId}")
    public ResponseEntity<Void> delete(@PathVariable UUID personId, @PathVariable UUID archiveId) {
        archiveRepo.deleteById(archiveId);
        return ResponseEntity.noContent().build();
    }
}
