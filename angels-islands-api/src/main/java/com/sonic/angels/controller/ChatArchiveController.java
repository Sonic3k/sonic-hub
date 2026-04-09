package com.sonic.angels.controller;

import com.sonic.angels.model.dto.ChatArchiveDto;
import com.sonic.angels.model.entity.ChatArchive;
import com.sonic.angels.model.entity.ChatMessage;
import com.sonic.angels.repository.ChatArchiveRepository;
import com.sonic.angels.repository.ChatMessageRepository;
import com.sonic.angels.repository.PersonRepository;
import com.sonic.angels.service.DtoMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/persons/{personId}/chat-archives")
public class ChatArchiveController {

    private final ChatArchiveRepository archiveRepo;
    private final ChatMessageRepository messageRepo;
    private final PersonRepository personRepo;
    private final DtoMapper mapper;

    public ChatArchiveController(ChatArchiveRepository archiveRepo, ChatMessageRepository messageRepo,
                                 PersonRepository personRepo, DtoMapper mapper) {
        this.archiveRepo = archiveRepo; this.messageRepo = messageRepo;
        this.personRepo = personRepo; this.mapper = mapper;
    }

    @GetMapping
    public List<ChatArchiveDto.Response> findByPerson(@PathVariable Long personId) {
        return archiveRepo.findByPersonId(personId).stream().map(mapper::toChatArchiveResponse).toList();
    }

    @GetMapping("/{archiveId}/messages")
    public List<ChatMessage> getMessages(@PathVariable Long archiveId) {
        return messageRepo.findByChatArchiveIdOrderByTimestampAsc(archiveId);
    }

    @PostMapping
    public ChatArchiveDto.Response create(@PathVariable Long personId, @RequestBody ChatArchive archive) {
        archive.setPerson(personRepo.findById(personId).orElseThrow());
        return mapper.toChatArchiveResponse(archiveRepo.save(archive));
    }

    @DeleteMapping("/{archiveId}")
    public ResponseEntity<Void> delete(@PathVariable Long archiveId) { archiveRepo.deleteById(archiveId); return ResponseEntity.noContent().build(); }
}
