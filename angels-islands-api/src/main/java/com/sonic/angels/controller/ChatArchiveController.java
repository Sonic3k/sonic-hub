package com.sonic.angels.controller;

import com.sonic.angels.model.entity.ChatArchive;
import com.sonic.angels.model.entity.ChatMessage;
import com.sonic.angels.repository.ChatArchiveRepository;
import com.sonic.angels.repository.ChatMessageRepository;
import com.sonic.angels.repository.PersonRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/persons/{personId}/chat-archives")
public class ChatArchiveController {

    private final ChatArchiveRepository chatArchiveRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final PersonRepository personRepository;

    public ChatArchiveController(ChatArchiveRepository chatArchiveRepository,
                                 ChatMessageRepository chatMessageRepository,
                                 PersonRepository personRepository) {
        this.chatArchiveRepository = chatArchiveRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.personRepository = personRepository;
    }

    @GetMapping
    public List<ChatArchive> findByPerson(@PathVariable Long personId) { return chatArchiveRepository.findByPersonId(personId); }

    @GetMapping("/{archiveId}")
    public ChatArchive findById(@PathVariable Long archiveId) { return chatArchiveRepository.findById(archiveId).orElseThrow(); }

    @GetMapping("/{archiveId}/messages")
    public List<ChatMessage> getMessages(@PathVariable Long archiveId) { return chatMessageRepository.findByChatArchiveIdOrderByTimestampAsc(archiveId); }

    @PostMapping
    public ChatArchive create(@PathVariable Long personId, @RequestBody ChatArchive archive) {
        archive.setPerson(personRepository.findById(personId).orElseThrow());
        return chatArchiveRepository.save(archive);
    }

    @DeleteMapping("/{archiveId}")
    public ResponseEntity<Void> delete(@PathVariable Long archiveId) {
        chatArchiveRepository.deleteById(archiveId);
        return ResponseEntity.noContent().build();
    }
}
