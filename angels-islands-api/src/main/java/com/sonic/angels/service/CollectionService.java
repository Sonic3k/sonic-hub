package com.sonic.angels.service;

import com.sonic.angels.model.dto.CollectionDto;
import com.sonic.angels.model.dto.MediaFileDto;
import com.sonic.angels.model.dto.PersonDto;
import com.sonic.angels.model.dto.TagDto;
import com.sonic.angels.model.entity.Collection;
import com.sonic.angels.model.entity.MediaFile;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.model.entity.Tag;
import com.sonic.angels.repository.CollectionRepository;
import com.sonic.angels.repository.MediaFileRepository;
import com.sonic.angels.repository.PersonRepository;
import com.sonic.angels.repository.TagRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
@Transactional
public class CollectionService {

    private final CollectionRepository collectionRepository;
    private final MediaFileRepository mediaFileRepository;
    private final PersonRepository personRepository;
    private final TagRepository tagRepository;
    private final StorageService storageService;
    private final DtoMapper mapper;

    public CollectionService(CollectionRepository collectionRepository, MediaFileRepository mediaFileRepository,
                             PersonRepository personRepository, TagRepository tagRepository,
                             StorageService storageService, DtoMapper mapper) {
        this.collectionRepository = collectionRepository;
        this.mediaFileRepository = mediaFileRepository;
        this.personRepository = personRepository;
        this.tagRepository = tagRepository;
        this.storageService = storageService;
        this.mapper = mapper;
    }

    public List<CollectionDto.Response> findAll() {
        return collectionRepository.findAll().stream().map(this::toResponse).toList();
    }

    public List<CollectionDto.Response> findRoots() {
        return collectionRepository.findByParentIsNull().stream().map(this::toResponse).toList();
    }

    public List<CollectionDto.Response> findByPersonId(UUID personId) {
        return collectionRepository.findByPersonsId(personId).stream().map(this::toResponse).toList();
    }

    public List<CollectionDto.Response> findByParentId(UUID parentId) {
        return collectionRepository.findByParentId(parentId).stream().map(this::toResponse).toList();
    }

    public CollectionDto.Response findResponseById(UUID id) {
        return toResponse(findById(id));
    }

    public Collection findById(UUID id) {
        return collectionRepository.findById(id).orElseThrow(() -> new RuntimeException("Collection not found: " + id));
    }

    public CollectionDto.Response create(CollectionDto.Request req) {
        Collection c = new Collection();
        applyRequest(c, req);
        return toResponse(collectionRepository.save(c));
    }

    public CollectionDto.Response update(UUID id, CollectionDto.Request req) {
        Collection c = findById(id);
        applyRequest(c, req);
        return toResponse(collectionRepository.save(c));
    }

    public void delete(UUID id) {
        Collection c = findById(id);
        deleteRecursive(c);
    }

    private void deleteRecursive(Collection c) {
        for (Collection child : new HashSet<>(c.getChildren())) {
            deleteRecursive(child);
        }
        c.getMediaFiles().clear();
        c.getTags().clear();
        c.getPersons().clear();
        collectionRepository.save(c);
        collectionRepository.delete(c);
    }

    // ── Media management ─────────────────────────────────────────────────────

    public void addMedia(UUID collectionId, UUID mediaId) {
        Collection c = findById(collectionId);
        MediaFile m = mediaFileRepository.findById(mediaId).orElseThrow(() -> new RuntimeException("MediaFile not found: " + mediaId));
        c.getMediaFiles().add(m);
        collectionRepository.save(c);
    }

    public void removeMedia(UUID collectionId, UUID mediaId) {
        Collection c = findById(collectionId);
        c.getMediaFiles().removeIf(m -> m.getId().equals(mediaId));
        collectionRepository.save(c);
    }

    public List<MediaFileDto.Response> getMedia(UUID collectionId) {
        Collection c = findById(collectionId);
        return c.getMediaFiles().stream().map(mapper::toMediaFileResponse).toList();
    }

    // ── Thumbnail ────────────────────────────────────────────────────────────

    public CollectionDto.Response setThumbnail(UUID collectionId, UUID mediaId) {
        Collection c = findById(collectionId);
        MediaFile m = mediaFileRepository.findById(mediaId).orElseThrow();
        c.setThumbnailMediaFile(m);
        return toResponse(collectionRepository.save(c));
    }

    // ── Breadcrumb ───────────────────────────────────────────────────────────

    public List<CollectionDto.Response> getBreadcrumb(UUID id) {
        List<CollectionDto.Response> crumbs = new ArrayList<>();
        Collection c = collectionRepository.findById(id).orElse(null);
        while (c != null) {
            CollectionDto.Response r = new CollectionDto.Response();
            r.setId(c.getId()); r.setName(c.getName());
            crumbs.add(0, r);
            c = c.getParent();
        }
        return crumbs;
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private void applyRequest(Collection c, CollectionDto.Request req) {
        if (req.getName() != null) c.setName(req.getName());
        if (req.getDescription() != null) c.setDescription(req.getDescription());
        if (req.getParentId() != null) {
            if (req.getParentId() == 0) c.setParent(null);
            else c.setParent(findById(req.getParentId()));
        }
        if (req.getPersonIds() != null) {
            c.setPersons(new HashSet<>(personRepository.findAllById(req.getPersonIds())));
        }
        if (req.getTagIds() != null) {
            c.setTags(new HashSet<>(tagRepository.findAllById(req.getTagIds())));
        }
    }

    private CollectionDto.Response toResponse(Collection c) {
        CollectionDto.Response r = new CollectionDto.Response();
        r.setId(c.getId()); r.setName(c.getName()); r.setDescription(c.getDescription());
        r.setChildrenCount(c.getChildren() != null ? c.getChildren().size() : 0);
        r.setMediaCount(c.getMediaFiles() != null ? c.getMediaFiles().size() : 0);
        r.setCreatedAt(c.getCreatedAt());
        if (c.getParent() != null) {
            r.setParentId(c.getParent().getId());
            r.setParentName(c.getParent().getName());
        }
        if (c.getThumbnailMediaFile() != null)
            r.setThumbnailUrl(storageService.buildCdnUrl(c.getThumbnailMediaFile().getStorageKey(), c.getThumbnailMediaFile().getStorageProvider()));
        if (c.getTags() != null)
            r.setTags(c.getTags().stream().map(mapper::toTagResponse).collect(Collectors.toSet()));
        if (c.getPersons() != null)
            r.setPersons(c.getPersons().stream().map(mapper::toPersonSummary).collect(Collectors.toSet()));
        return r;
    }
}
