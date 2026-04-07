package com.sonic.hub.service;

import com.sonic.hub.dto.EntryDto;
import com.sonic.hub.dto.TagDto;
import com.sonic.hub.exception.ResourceNotFoundException;
import com.sonic.hub.model.Entry;
import com.sonic.hub.model.EntryType;
import com.sonic.hub.repository.EntryRepository;
import com.sonic.hub.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EntryService {

    private final EntryRepository entryRepository;
    private final TagRepository tagRepository;
    private final TagService tagService;
    private final ProjectService projectService;

    public List<EntryDto.Response> getByEntity(String entityType, UUID entityId) {
        return entryRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<EntryDto.Response> getRecent(int days) {
        LocalDateTime after = LocalDateTime.now().minusDays(days);
        return entryRepository.findByCreatedAtAfterOrderByCreatedAtDesc(after)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public EntryDto.Response getById(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional
    public EntryDto.Response create(EntryDto.Request request) {
        Entry entry = Entry.builder()
                .entityType(request.getEntityType())
                .entityId(request.getEntityId())
                .content(request.getContent())
                .entryType(request.getEntryType() != null ? request.getEntryType() : EntryType.NOTE)
                .createdBy(request.getCreatedBy())
                .build();
        if (request.getProjectId() != null) {
            entry.setProject(projectService.findById(request.getProjectId()));
        }
        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            entry.setTags(tagRepository.findAllByIdIn(request.getTagIds()));
        }
        return toResponse(entryRepository.save(entry));
    }

    @Transactional
    public void delete(UUID id) {
        entryRepository.delete(findById(id));
    }

    private Entry findById(UUID id) {
        return entryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entry not found: " + id));
    }

    private EntryDto.Response toResponse(Entry e) {
        Set<TagDto.Response> tagResponses = e.getTags().stream()
                .map(tagService::toResponse).collect(Collectors.toSet());
        return EntryDto.Response.builder()
                .id(e.getId())
                .entityType(e.getEntityType())
                .entityId(e.getEntityId())
                .content(e.getContent())
                .entryType(e.getEntryType())
                .projectId(e.getProject() != null ? e.getProject().getId() : null)
                .projectName(e.getProject() != null ? e.getProject().getName() : null)
                .tags(tagResponses)
                .createdBy(e.getCreatedBy())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
