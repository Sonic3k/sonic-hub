package com.sonic.angels.controller;

import com.sonic.angels.model.dto.ChatArchiveDto;
import com.sonic.angels.model.entity.ChatArchive;
import com.sonic.angels.model.entity.ChatMessage;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.repository.ChatArchiveRepository;
import com.sonic.angels.repository.ChatMessageRepository;
import com.sonic.angels.repository.PersonRepository;
import com.sonic.angels.service.DtoMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Other chats: conversations kept for reading, not linked to anyone in Persons
 * (friends Ngoc Anh chatted with a lot who are not among the angels).
 */
@RestController
@RequestMapping("/api/chat-archives")
@Transactional
public class OtherChatController {

    private final ChatArchiveRepository archiveRepo;
    private final ChatMessageRepository messageRepo;
    private final PersonRepository personRepo;
    private final DtoMapper mapper;

    public OtherChatController(ChatArchiveRepository archiveRepo, ChatMessageRepository messageRepo,
                               PersonRepository personRepo, DtoMapper mapper) {
        this.archiveRepo = archiveRepo;
        this.messageRepo = messageRepo;
        this.personRepo = personRepo;
        this.mapper = mapper;
    }

    /** Every other chat; the admin groups them by counterpartKey (one friend across Yahoo, Facebook, SMS). */
    @GetMapping("/others")
    public List<ChatArchiveDto.Response> others() {
        return archiveRepo.findOthers().stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public ChatArchiveDto.Response one(@PathVariable UUID id) {
        return toResponse(find(id));
    }

    /** Paged messages in original order; q filters by content (same as the person-scoped endpoint). */
    @GetMapping("/{id}/messages")
    public Page<ChatMessage> messages(@PathVariable UUID id,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "200") int size,
                                      @RequestParam(required = false) String q) {
        find(id);
        var pageable = PageRequest.of(page, Math.min(size, 500), Sort.by("seq").ascending());
        if (q != null && !q.isBlank())
            return messageRepo.findByChatArchiveIdAndContentContainingIgnoreCase(id, q.trim(), pageable);
        return messageRepo.findVisibleByArchive(id, ChatMessage.Kind.EMPTY, pageable);
    }

    /** Link to a person (personId), unlink (unlink=true), or rename the counterpart. */
    @PatchMapping("/{id}")
    public ChatArchiveDto.Response patch(@PathVariable UUID id, @RequestBody ChatArchiveDto.ArchivePatch req) {
        ChatArchive a = find(id);
        if (Boolean.TRUE.equals(req.getUnlink())) {
            if (a.getCounterpart() == null || a.getCounterpart().isBlank())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "set a counterpart name before unlinking");
            a.setPerson(null);
        } else if (req.getPersonId() != null) {
            Person p = personRepo.findById(req.getPersonId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "person not found"));
            if (a.getExternalKey() != null) {
                archiveRepo.findByPersonIdAndExternalKey(p.getId(), a.getExternalKey())
                    .filter(other -> !other.getId().equals(a.getId()))
                    .ifPresent(other -> { throw new ResponseStatusException(HttpStatus.CONFLICT, "this person already has that conversation"); });
            }
            a.setPerson(p);
        }
        if (req.getCounterpart() != null && !req.getCounterpart().isBlank()) {
            String c = req.getCounterpart().trim();
            a.setCounterpart(c.length() > 200 ? c.substring(0, 200) : c);
        }
        return toResponse(archiveRepo.save(a));
    }

    private ChatArchive find(UUID id) {
        ChatArchive a = archiveRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "archive not found"));
        if (a.getPerson() != null && a.getCounterpartKey() == null)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not an other chat");   // angels' archives live under /api/persons
        return a;
    }

    private ChatArchiveDto.Response toResponse(ChatArchive a) {
        ChatArchiveDto.Response r = mapper.toChatArchiveResponse(a);
        if (a.getPerson() != null)
            r.setPersonName(a.getPerson().getDisplayName() != null ? a.getPerson().getDisplayName() : a.getPerson().getName());
        return r;
    }
}
