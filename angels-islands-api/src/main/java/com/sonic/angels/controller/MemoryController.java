package com.sonic.angels.controller;

import com.sonic.angels.model.dto.MemoryDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import com.sonic.angels.service.DtoMapper;
import com.sonic.angels.service.MemoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/persons/{personId}/memory")
public class MemoryController {

    private final FactRepository factRepo;
    private final EpisodeRepository episodeRepo;
    private final LifeChapterRepository chapterRepo;
    private final PersonalityTraitRepository traitRepo;
    private final PersonRepository personRepo;
    private final DtoMapper mapper;
    private final com.sonic.angels.service.MemoryImportService memoryImport;
    private final MemoryService memory;

    public MemoryController(FactRepository factRepo, EpisodeRepository episodeRepo,
                            LifeChapterRepository chapterRepo, PersonalityTraitRepository traitRepo,
                            PersonRepository personRepo, DtoMapper mapper,
                            com.sonic.angels.service.MemoryImportService memoryImport, MemoryService memory) {
        this.factRepo = factRepo; this.episodeRepo = episodeRepo;
        this.chapterRepo = chapterRepo; this.traitRepo = traitRepo;
        this.personRepo = personRepo; this.mapper = mapper; this.memoryImport = memoryImport; this.memory = memory;
    }

    /** Memories picked at random across kinds: types = episode,fact,chapter,trait (all when left out).
     *  An episode comes without its links unless asked: the incl* parameters, as on GET …/episodes. */
    @GetMapping("/random")
    public List<MemoryDto.RandomItem> random(@PathVariable UUID personId,
                                             @RequestParam(defaultValue = "1") int count,
                                             @RequestParam(required = false) java.util.Set<String> types,
                                             @RequestParam(required = false) String status,
                                             @RequestParam(required = false) Integer minImportance,
                                             @RequestParam(defaultValue = "false") boolean inclMedia,
                                             @RequestParam(defaultValue = "false") boolean inclCollections,
                                             @RequestParam(defaultValue = "false") boolean inclTags,
                                             @RequestParam(defaultValue = "false") boolean inclPersons,
                                             @RequestParam(defaultValue = "false") boolean inclSources) {
        return memory.random(personId, count, types, status, minImportance,
            new MemoryDto.Includes(inclMedia, inclCollections, inclTags, inclPersons, inclSources));
    }

    /** Replace everything one source wrote for this person (e.g. "analysis"); memory typed in by hand is never touched. */
    @PutMapping("/sources/{source}")
    public java.util.Map<String, Object> replaceSource(@PathVariable UUID personId, @PathVariable String source,
                                                       @RequestBody MemoryDto.SourceImport req) {
        return memoryImport.replace(personId, source, req);
    }

    @GetMapping("/facts")
    public List<MemoryDto.FactResponse> getFacts(@PathVariable UUID personId) { return factRepo.findByPersonId(personId).stream().map(mapper::toFactResponse).toList(); }

    @PostMapping("/facts")
    public MemoryDto.FactResponse createFact(@PathVariable UUID personId, @RequestBody MemoryDto.FactRequest req) {
        Fact f = new Fact(); f.setPerson(personRepo.findById(personId).orElseThrow());
        f.setCategory(req.getCategory()); f.setKey(req.getKey()); f.setValue(req.getValue());
        f.setPeriod(req.getPeriod()); f.setConfidence(req.getConfidence()); f.setSource(req.getSource());
        f.setStatus(req.getStatus() != null ? MemoryService.status(req.getStatus()) : MemoryStatus.CONFIRMED);
        return mapper.toFactResponse(factRepo.save(f));
    }

    @PutMapping("/facts/{id}")
    public MemoryDto.FactResponse updateFact(@PathVariable UUID personId, @PathVariable UUID id, @RequestBody MemoryDto.FactRequest req) {
        Fact f = factRepo.findById(id).orElseThrow();
        if (req.getCategory() != null) f.setCategory(req.getCategory());
        if (req.getKey() != null) f.setKey(req.getKey());
        if (req.getValue() != null) f.setValue(req.getValue());
        if (req.getPeriod() != null) f.setPeriod(req.getPeriod().isBlank() ? null : req.getPeriod());
        if (req.getConfidence() != null) f.setConfidence(req.getConfidence());
        if (req.getSource() != null) f.setSource(req.getSource().isBlank() ? null : req.getSource());
        if (req.getStatus() != null) f.setStatus(MemoryService.status(req.getStatus()));
        return mapper.toFactResponse(factRepo.save(f));
    }

    @DeleteMapping("/facts/{id}")
    public ResponseEntity<Void> deleteFact(@PathVariable UUID id) { factRepo.deleteById(id); return ResponseEntity.noContent().build(); }

    /** All episodes, newest first; each filter is optional. q matches words anywhere (title, summary, place, tags,
     *  people, album names, photo captions), without minding Vietnamese marks. from / to = yyyy-MM-dd.
     *  A memory comes without its links unless asked: inclMedia (media, mediaIds), inclCollections, inclTags,
     *  inclPersons, inclSources (sourceViews). The event's title comes only with a single memory (…/episodes/{id}),
     *  which always carries everything. */
    @GetMapping("/episodes")
    public List<MemoryDto.EpisodeResponse> getEpisodes(@PathVariable UUID personId,
            @RequestParam(required = false) String q, @RequestParam(required = false) String kind,
            @RequestParam(required = false) String status, @RequestParam(required = false) String source,
            @RequestParam(required = false) UUID tagId, @RequestParam(required = false) UUID withPersonId,
            @RequestParam(required = false) UUID mediaId, @RequestParam(required = false) UUID collectionId,
            @RequestParam(required = false) java.time.LocalDate from, @RequestParam(required = false) java.time.LocalDate to,
            @RequestParam(required = false) Integer minImportance, @RequestParam(defaultValue = "false") boolean oldestFirst,
            @RequestParam(defaultValue = "false") boolean inclMedia, @RequestParam(defaultValue = "false") boolean inclCollections,
            @RequestParam(defaultValue = "false") boolean inclTags, @RequestParam(defaultValue = "false") boolean inclPersons,
            @RequestParam(defaultValue = "false") boolean inclSources) {
        return memory.episodes(personId, new MemoryService.EpisodeQuery(q, kind, status, source, tagId, withPersonId,
            mediaId, collectionId, from, to, minImportance, oldestFirst),
            new MemoryDto.Includes(inclMedia, inclCollections, inclTags, inclPersons, inclSources));
    }

    @GetMapping("/episodes/{id}")
    public MemoryDto.EpisodeResponse getEpisode(@PathVariable UUID personId, @PathVariable UUID id) { return memory.episode(id); }

    /** The photos of one memory as files (what GET /media-files/{id} gives for each), in the memory's order; the
     *  incl* parameters as on the photo lists. */
    @GetMapping("/episodes/{id}/media")
    public List<com.sonic.angels.model.dto.MediaFileDto.Response> getEpisodeMedia(@PathVariable UUID personId, @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean inclDetails, @RequestParam(defaultValue = "false") boolean inclPersons,
            @RequestParam(defaultValue = "false") boolean inclTags) {
        return memory.media(id, new com.sonic.angels.model.dto.MediaFileDto.Includes(inclDetails, inclPersons, inclTags));
    }

    @PostMapping("/episodes")
    public MemoryDto.EpisodeResponse createEpisode(@PathVariable UUID personId, @RequestBody MemoryDto.EpisodeRequest req) {
        return memory.create(personId, req);
    }

    @PutMapping("/episodes/{id}")
    public MemoryDto.EpisodeResponse updateEpisode(@PathVariable UUID personId, @PathVariable UUID id, @RequestBody MemoryDto.EpisodeRequest req,
                                                   jakarta.servlet.http.HttpServletRequest http) {
        refuseStaleEditor(http, req);
        return memory.update(id, req);
    }

    /** What a browser's memory editor sends to say which editor it is (2: it reads the whole memory before it opens). */
    public static final String CLIENT_HEADER = "X-Admin-Client";

    /** The admin's memory editor writes every link back when it saves. Lists no longer carry a memory's links unless
     *  asked (incl*), so a page of the admin loaded before that change would open its form on a list's copy — without
     *  links — and saving it would wipe them. A browser therefore has to say it is the editor that reads the whole
     *  memory first; an older page is refused (409) and has to be reloaded. Requests that do not come from a browser
     *  (no Origin: the import scripts) and saves that touch no link are not asked. */
    private static void refuseStaleEditor(jakarta.servlet.http.HttpServletRequest http, MemoryDto.EpisodeRequest r) {
        boolean links = r.getMediaIds() != null || r.getCollectionIds() != null || r.getTagIds() != null
            || r.getPersonIds() != null || r.getSources() != null;
        if (!links || http.getHeader("Origin") == null) return;
        int client = 0;
        try { client = Integer.parseInt(http.getHeader(CLIENT_HEADER)); } catch (NumberFormatException ignored) {}   // no header: an old page
        if (client < 2) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
            "This admin page is older than the API: reload it before changing a memory's photos, albums, tags, people or sources.");
    }

    @DeleteMapping("/episodes/{id}")
    public ResponseEntity<Void> deleteEpisode(@PathVariable UUID id) { episodeRepo.deleteById(id); return ResponseEntity.noContent().build(); }

    @GetMapping("/chapters")
    public List<MemoryDto.ChapterResponse> getChapters(@PathVariable UUID personId) { return chapterRepo.findByPersonIdOrderBySortOrderAsc(personId).stream().map(mapper::toChapterResponse).toList(); }

    @PostMapping("/chapters")
    public MemoryDto.ChapterResponse createChapter(@PathVariable UUID personId, @RequestBody MemoryDto.ChapterRequest req) {
        LifeChapter c = new LifeChapter(); c.setPerson(personRepo.findById(personId).orElseThrow());
        c.setPeriod(req.getPeriod()); c.setTitle(req.getTitle()); c.setSummary(req.getSummary());
        c.setSentiment(req.getSentiment()); c.setSortOrder(req.getSortOrder()); c.setSource(req.getSource());
        c.setStatus(req.getStatus() != null ? MemoryService.status(req.getStatus()) : MemoryStatus.CONFIRMED);
        return mapper.toChapterResponse(chapterRepo.save(c));
    }

    @PutMapping("/chapters/{id}")
    public MemoryDto.ChapterResponse updateChapter(@PathVariable UUID personId, @PathVariable UUID id, @RequestBody MemoryDto.ChapterRequest req) {
        LifeChapter c = chapterRepo.findById(id).orElseThrow();
        if (req.getPeriod() != null) c.setPeriod(req.getPeriod());
        if (req.getTitle() != null) c.setTitle(req.getTitle().isBlank() ? null : req.getTitle());
        if (req.getSummary() != null) c.setSummary(req.getSummary().isBlank() ? null : req.getSummary());
        if (req.getSentiment() != null) c.setSentiment(req.getSentiment().isBlank() ? null : req.getSentiment());
        if (req.getSortOrder() != null) c.setSortOrder(req.getSortOrder());
        if (req.getSource() != null) c.setSource(req.getSource().isBlank() ? null : req.getSource());
        if (req.getStatus() != null) c.setStatus(MemoryService.status(req.getStatus()));
        return mapper.toChapterResponse(chapterRepo.save(c));
    }

    @DeleteMapping("/chapters/{id}")
    public ResponseEntity<Void> deleteChapter(@PathVariable UUID id) { chapterRepo.deleteById(id); return ResponseEntity.noContent().build(); }

    @GetMapping("/traits")
    public List<MemoryDto.TraitResponse> getTraits(@PathVariable UUID personId) { return traitRepo.findByPersonId(personId).stream().map(mapper::toTraitResponse).toList(); }

    @PostMapping("/traits")
    public MemoryDto.TraitResponse createTrait(@PathVariable UUID personId, @RequestBody MemoryDto.TraitRequest req) {
        PersonalityTrait t = new PersonalityTrait(); t.setPerson(personRepo.findById(personId).orElseThrow());
        t.setTrait(req.getTrait()); t.setDescription(req.getDescription());
        t.setEvidence(req.getEvidence()); t.setPeriod(req.getPeriod()); t.setSource(req.getSource());
        t.setStatus(req.getStatus() != null ? MemoryService.status(req.getStatus()) : MemoryStatus.CONFIRMED);
        return mapper.toTraitResponse(traitRepo.save(t));
    }

    @PutMapping("/traits/{id}")
    public MemoryDto.TraitResponse updateTrait(@PathVariable UUID personId, @PathVariable UUID id, @RequestBody MemoryDto.TraitRequest req) {
        PersonalityTrait t = traitRepo.findById(id).orElseThrow();
        if (req.getTrait() != null) t.setTrait(req.getTrait());
        if (req.getDescription() != null) t.setDescription(req.getDescription().isBlank() ? null : req.getDescription());
        if (req.getEvidence() != null) t.setEvidence(req.getEvidence().isBlank() ? null : req.getEvidence());
        if (req.getPeriod() != null) t.setPeriod(req.getPeriod().isBlank() ? null : req.getPeriod());
        if (req.getSource() != null) t.setSource(req.getSource().isBlank() ? null : req.getSource());
        if (req.getStatus() != null) t.setStatus(MemoryService.status(req.getStatus()));
        return mapper.toTraitResponse(traitRepo.save(t));
    }

    @DeleteMapping("/traits/{id}")
    public ResponseEntity<Void> deleteTrait(@PathVariable UUID id) { traitRepo.deleteById(id); return ResponseEntity.noContent().build(); }
}
