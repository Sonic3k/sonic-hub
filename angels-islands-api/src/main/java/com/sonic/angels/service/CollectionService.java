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

import java.time.LocalDateTime;
import java.util.*;
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

    // ── Root collection ──────────────────────────────────────────────────────

    public Collection getRoot() {
        return collectionRepository.findByNameAndParentIsNull("Angels Islands")
            .orElseThrow(() -> new RuntimeException("Root collection 'Angels Islands' not found. App not initialized."));
    }

    public UUID getRootId() { return getRoot().getId(); }

    // ── Queries (scoped under root) ──────────────────────────────────────────

    public List<CollectionDto.Response> findAll(Includes inc) {
        // All collections under root (excluding root itself)
        return collectionRepository.findAll().stream()
            .filter(c -> !c.getId().equals(getRootId()))
            .map(c -> toResponse(c, inc)).toList();
    }

    public List<CollectionDto.Response> findTopLevel(Includes inc) {
        // Direct children of root = top-level collections
        return collectionRepository.findByParentId(getRootId()).stream().map(c -> toResponse(c, inc)).toList();
    }

    public List<CollectionDto.Response> findByPersonId(UUID personId, Includes inc) {
        return collectionRepository.findByPersonsId(personId).stream()
            .filter(c -> !c.getId().equals(getRootId()))
            .map(c -> toResponse(c, inc)).toList();
    }

    public List<CollectionDto.Response> findByParentId(UUID parentId, Includes inc) {
        return collectionRepository.findByParentId(parentId).stream().map(c -> toResponse(c, inc)).toList();
    }

    public CollectionDto.Response findResponseById(UUID id) {
        return toResponse(findById(id));
    }

    public Collection findById(UUID id) {
        return collectionRepository.findById(id).orElseThrow(() -> new RuntimeException("Collection not found: " + id));
    }

    // ── Slug & storage path ──────────────────────────────────────────────────

    /** Ensure the collection has a slug (generated once from name, deduped among siblings). */
    public String ensureSlug(Collection c) {
        if (c.getSlug() != null && !c.getSlug().isBlank()) return c.getSlug();
        String base = com.sonic.angels.util.SlugUtil.slugify(c.getName());
        String candidate = base;
        int i = 2;
        UUID parentId = c.getParent() != null ? c.getParent().getId() : null;
        if (parentId != null) {
            while (hasSiblingWithSlug(parentId, candidate, c.getId())) {
                candidate = base + "-" + i++;
            }
        }
        c.setSlug(candidate);
        collectionRepository.save(c);
        return candidate;
    }

    private boolean hasSiblingWithSlug(UUID parentId, String slug, UUID selfId) {
        return collectionRepository.findByParentIdAndSlug(parentId, slug).stream()
            .anyMatch(other -> selfId == null || !other.getId().equals(selfId));
    }

    /** Real folder path in storage: root-slug/sub-slug/... System root "Angels Islands" maps to "" (bucket prefix root). */
    public String storagePath(UUID collectionId) {
        Collection c = findById(collectionId);
        if (c.getParent() == null) return ""; // system root → files live at the top level
        Deque<String> parts = new ArrayDeque<>();
        Collection cur = c;
        int guard = 0;
        while (cur != null && cur.getParent() != null && guard++ < 20) {
            parts.addFirst(ensureSlug(cur));
            cur = cur.getParent();
        }
        return String.join("/", parts);
    }

    public CollectionDto.Response create(CollectionDto.Request req) {
        Collection c = new Collection();
        applyRequest(c, req);
        // Default parent to root if not specified
        if (c.getParent() == null) c.setParent(getRoot());
        Collection saved = collectionRepository.save(c);
        ensureSlug(saved);
        return toResponse(saved);
    }

    public CollectionDto.Response update(UUID id, CollectionDto.Request req) {
        Collection c = findById(id);
        applyRequest(c, req);
        return toResponse(collectionRepository.save(c));
    }

    public void delete(UUID id) {
        if (id.equals(getRootId())) throw new RuntimeException("Cannot delete root collection");
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

    /** First IMAGE uploaded into a cover-less collection becomes its cover automatically.
     *  Videos are skipped (card thumbnails are CDN image resizes). Explicit set-cover always wins later. */
    public void setCoverIfMissing(UUID collectionId, MediaFile mf) {
        if (mf.getFileType() != MediaFile.FileType.IMAGE) return;
        Collection c = findById(collectionId);
        if (c.getThumbnailMediaFile() == null) {
            c.setThumbnailMediaFile(mf);
            collectionRepository.save(c);
        }
    }

    public int addMediaBatch(UUID collectionId, List<UUID> mediaIds) {
        Collection c = findById(collectionId);
        List<MediaFile> files = mediaFileRepository.findAllById(mediaIds);
        c.getMediaFiles().addAll(files);
        collectionRepository.save(c);
        return files.size();
    }

    public int removeMediaBatch(UUID collectionId, List<UUID> mediaIds) {
        Collection c = findById(collectionId);
        Set<UUID> ids = new HashSet<>(mediaIds);
        int before = c.getMediaFiles().size();
        c.getMediaFiles().removeIf(m -> ids.contains(m.getId()));
        collectionRepository.save(c);
        return before - c.getMediaFiles().size();
    }

    /** Move = add to target + remove from source, single transaction. Files stay put in B2. */
    public Map<String, Integer> moveMediaBatch(UUID fromCollectionId, UUID toCollectionId, List<UUID> mediaIds) {
        int added = addMediaBatch(toCollectionId, mediaIds);
        int removed = removeMediaBatch(fromCollectionId, mediaIds);
        return Map.of("added", added, "removed", removed);
    }

    public void removeMedia(UUID collectionId, UUID mediaId) {
        Collection c = findById(collectionId);
        c.getMediaFiles().removeIf(m -> m.getId().equals(mediaId));
        collectionRepository.save(c);
    }

    public List<MediaFileDto.Response> getMedia(UUID collectionId, String sort, String sortDir, MediaFileDto.Includes inc) {
        Collection c = findById(collectionId);
        java.util.Comparator<MediaFile> cmp = switch (sort != null ? sort : "effectiveDate") {
            case "name" -> java.util.Comparator.comparing(MediaFile::getFileName, String.CASE_INSENSITIVE_ORDER);
            case "uploadedAt" -> java.util.Comparator.comparing(m -> m.getUploadedAt() != null ? m.getUploadedAt() : LocalDateTime.MIN);
            default -> java.util.Comparator.comparing(m -> m.getEffectiveDate() != null ? m.getEffectiveDate() : LocalDateTime.MIN);
        };
        if ("desc".equalsIgnoreCase(sortDir)) cmp = cmp.reversed();
        return c.getMediaFiles().stream().sorted(cmp).map(m -> mapper.toMediaFileResponse(m, inc)).toList();
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
        UUID rootId = getRootId();
        while (c != null && !c.getId().equals(rootId)) {
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
            if (req.getParentId().equals(new UUID(0, 0))) c.setParent(null);
            else {
                Collection newParent = findById(req.getParentId());
                assertNotSelfOrDescendant(c, newParent);
                c.setParent(newParent);
            }
        }
        if (req.getPersonIds() != null) {
            c.setPersons(new HashSet<>(personRepository.findAllById(req.getPersonIds())));
        }
        if (req.getTagIds() != null) {
            c.setTags(new HashSet<>(tagRepository.findAllById(req.getTagIds())));
        }
    }

    /** Guard: a collection cannot be moved into itself or one of its own descendants. */
    private void assertNotSelfOrDescendant(Collection c, Collection candidateParent) {
        if (c.getId() == null) return; // create path
        Collection cur = candidateParent;
        int guard = 0;
        while (cur != null && guard++ < 50) {
            if (c.getId().equals(cur.getId()))
                throw new RuntimeException("Cannot move a collection into itself or its descendants");
            cur = cur.getParent();
        }
    }

    /** Which optional fields to populate. Order: childrenCount, mediaCount, tags, persons. */
    public record Includes(boolean childrenCount, boolean mediaCount, boolean tags, boolean persons) {
        public static Includes none() { return new Includes(false, false, false, false); }
        public static Includes all()  { return new Includes(true, true, true, true); }
    }

    private CollectionDto.Response toResponse(Collection c) {
        return toResponse(c, Includes.all());
    }

    /**
     * Heavy/lazy fields (counts, tags, persons) only fetched when the matching include flag
     * is on. Counts use dedicated COUNT queries instead of loading whole lazy sets.
     * id/name/description/createdAt/parent/thumbnail are always included (cheap).
     */
    private CollectionDto.Response toResponse(Collection c, Includes inc) {
        CollectionDto.Response r = new CollectionDto.Response();
        r.setId(c.getId()); r.setName(c.getName()); r.setDescription(c.getDescription());
        r.setCreatedAt(c.getCreatedAt());
        if (c.getParent() != null) {
            r.setParentId(c.getParent().getId());
            r.setParentName(c.getParent().getName());
        }
        if (c.getThumbnailMediaFile() != null)
            r.setThumbnailUrl(storageService.buildCdnUrl(c.getThumbnailMediaFile().getStorageKey(), c.getThumbnailMediaFile().getStorageProvider()));
        if (inc.childrenCount())
            r.setChildrenCount((int) collectionRepository.countByParentId(c.getId()));
        if (inc.mediaCount())
            r.setMediaCount((int) collectionRepository.countMediaInCollection(c.getId()));
        if (inc.tags() && c.getTags() != null)
            r.setTags(c.getTags().stream().map(mapper::toTagResponse).collect(Collectors.toSet()));
        if (inc.persons() && c.getPersons() != null)
            r.setPersons(c.getPersons().stream().map(mapper::toPersonSummary).collect(Collectors.toSet()));
        return r;
    }

    // ── Tree creation (folder upload) ────────────────────────────────────────

    public CollectionDto.TreeResponse createTree(CollectionDto.TreeRequest req) {
        // Tree root goes under the given parent, else under "Angels Islands"
        Collection parent = req.getParentId() != null ? findById(req.getParentId()) : getRoot();
        Collection treeRoot = new Collection();
        treeRoot.setName(req.getRootName());
        treeRoot.setParent(parent);
        if (req.getPersonIds() != null && !req.getPersonIds().isEmpty()) {
            treeRoot.setPersons(new HashSet<>(personRepository.findAllById(req.getPersonIds())));
        }
        treeRoot = collectionRepository.save(treeRoot);
        ensureSlug(treeRoot);

        Map<String, UUID> pathToId = new HashMap<>();
        pathToId.put("", treeRoot.getId());

        if (req.getFolders() != null) {
            List<String> sorted = req.getFolders().stream().sorted().toList();
            for (String folderPath : sorted) {
                String[] parts = folderPath.split("/");
                StringBuilder currentPath = new StringBuilder();
                for (int i = 0; i < parts.length; i++) {
                    if (i > 0) currentPath.append("/");
                    currentPath.append(parts[i]);
                    String key = currentPath.toString();
                    if (!pathToId.containsKey(key)) {
                        String parentPath = key.contains("/") ? key.substring(0, key.lastIndexOf("/")) : "";
                        UUID parentId = pathToId.get(parentPath);
                        Collection sub = new Collection();
                        sub.setName(parts[i]);
                        sub.setParent(collectionRepository.findById(parentId).orElse(treeRoot));
                        if (treeRoot.getPersons() != null && !treeRoot.getPersons().isEmpty()) {
                            sub.setPersons(new HashSet<>(treeRoot.getPersons()));
                        }
                        sub = collectionRepository.save(sub);
                        ensureSlug(sub);
                        pathToId.put(key, sub.getId());
                    }
                }
            }
        }

        CollectionDto.TreeResponse resp = new CollectionDto.TreeResponse();
        resp.setRootId(treeRoot.getId());
        pathToId.remove("");
        resp.setPathToId(pathToId);
        return resp;
    }
}
