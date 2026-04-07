package com.sonic.hub.service;

import com.sonic.hub.dto.TagDto;
import com.sonic.hub.dto.WishlistDto;
import com.sonic.hub.exception.ResourceNotFoundException;
import com.sonic.hub.model.Wishlist;
import com.sonic.hub.repository.TagRepository;
import com.sonic.hub.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final TagRepository tagRepository;
    private final TagService tagService;
    private final ProjectService projectService;

    public List<WishlistDto.Response> getAll(String category, Boolean archived) {
        boolean arch = archived != null ? archived : false;
        if (category != null) {
            return wishlistRepository.findByCategoryAndArchivedOrderByCreatedAtDesc(category, arch)
                    .stream().map(this::toResponse).collect(Collectors.toList());
        }
        return wishlistRepository.findByArchivedOrderByCreatedAtDesc(arch)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public WishlistDto.Response getById(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional
    public WishlistDto.Response create(WishlistDto.Request request) {
        Wishlist item = Wishlist.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .category(request.getCategory() != null ? request.getCategory() : "general")
                .createdBy(request.getCreatedBy())
                .build();
        if (request.getProjectId() != null) {
            item.setProject(projectService.findById(request.getProjectId()));
        }
        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            item.setTags(tagRepository.findAllByIdIn(request.getTagIds()));
        }
        return toResponse(wishlistRepository.save(item));
    }

    @Transactional
    public WishlistDto.Response update(UUID id, WishlistDto.Request request) {
        Wishlist item = findById(id);
        item.setTitle(request.getTitle().trim());
        if (request.getDescription() != null) item.setDescription(request.getDescription());
        if (request.getCategory() != null) item.setCategory(request.getCategory());
        if (request.getArchived() != null) item.setArchived(request.getArchived());
        if (request.getProjectId() != null) {
            item.setProject(projectService.findById(request.getProjectId()));
        } else {
            item.setProject(null);
        }
        if (request.getTagIds() != null) {
            item.setTags(tagRepository.findAllByIdIn(request.getTagIds()));
        }
        return toResponse(wishlistRepository.save(item));
    }

    @Transactional
    public WishlistDto.Response addTag(UUID id, UUID tagId) {
        Wishlist item = findById(id);
        item.getTags().add(tagService.findById(tagId));
        return toResponse(wishlistRepository.save(item));
    }

    @Transactional
    public WishlistDto.Response removeTag(UUID id, UUID tagId) {
        Wishlist item = findById(id);
        item.getTags().removeIf(t -> t.getId().equals(tagId));
        return toResponse(wishlistRepository.save(item));
    }

    @Transactional
    public void delete(UUID id) {
        wishlistRepository.delete(findById(id));
    }

    private Wishlist findById(UUID id) {
        return wishlistRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Wishlist item not found: " + id));
    }

    private WishlistDto.Response toResponse(Wishlist w) {
        Set<TagDto.Response> tagResponses = w.getTags().stream()
                .map(tagService::toResponse).collect(Collectors.toSet());
        return WishlistDto.Response.builder()
                .id(w.getId())
                .title(w.getTitle())
                .description(w.getDescription())
                .category(w.getCategory())
                .projectId(w.getProject() != null ? w.getProject().getId() : null)
                .projectName(w.getProject() != null ? w.getProject().getName() : null)
                .tags(tagResponses)
                .archived(w.getArchived() != null ? w.getArchived() : false)
                .createdBy(w.getCreatedBy())
                .createdAt(w.getCreatedAt())
                .updatedAt(w.getUpdatedAt())
                .build();
    }
}
