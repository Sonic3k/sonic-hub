package com.sonic.hub.service;

import com.sonic.hub.dto.TagDto;
import com.sonic.hub.exception.ConflictException;
import com.sonic.hub.exception.ResourceNotFoundException;
import com.sonic.hub.model.Tag;
import com.sonic.hub.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TagService {

    private final TagRepository tagRepository;

    public List<TagDto.Response> getAll() {
        return tagRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public TagDto.Response getById(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional
    public TagDto.Response create(TagDto.Request request) {
        if (tagRepository.existsByName(request.getName())) {
            throw new ConflictException("Tag name already exists: " + request.getName());
        }
        Tag tag = Tag.builder()
                .name(request.getName().trim())
                .color(request.getColor())
                .build();
        return toResponse(tagRepository.save(tag));
    }

    @Transactional
    public TagDto.Response update(UUID id, TagDto.Request request) {
        Tag tag = findById(id);
        if (!tag.getName().equals(request.getName()) && tagRepository.existsByName(request.getName())) {
            throw new ConflictException("Tag name already exists: " + request.getName());
        }
        tag.setName(request.getName().trim());
        tag.setColor(request.getColor());
        return toResponse(tagRepository.save(tag));
    }

    @Transactional
    public void delete(UUID id) {
        Tag tag = findById(id);
        tagRepository.delete(tag);
    }

    // --- Helpers ---

    public Tag findById(UUID id) {
        return tagRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tag not found: " + id));
    }

    public TagDto.Response toResponse(Tag tag) {
        return TagDto.Response.builder()
                .id(tag.getId())
                .name(tag.getName())
                .color(tag.getColor())
                .createdAt(tag.getCreatedAt())
                .updatedAt(tag.getUpdatedAt())
                .build();
    }
}
