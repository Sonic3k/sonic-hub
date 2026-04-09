package com.sonic.angels.controller;

import com.sonic.angels.model.dto.MemoryDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import com.sonic.angels.service.DtoMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/persons/{personId}/memory")
public class MemoryController {

    private final FactRepository factRepo;
    private final EpisodeRepository episodeRepo;
    private final LifeChapterRepository chapterRepo;
    private final PersonalityTraitRepository traitRepo;
    private final PersonRepository personRepo;
    private final DtoMapper mapper;

    public MemoryController(FactRepository factRepo, EpisodeRepository episodeRepo,
                            LifeChapterRepository chapterRepo, PersonalityTraitRepository traitRepo,
                            PersonRepository personRepo, DtoMapper mapper) {
        this.factRepo = factRepo; this.episodeRepo = episodeRepo;
        this.chapterRepo = chapterRepo; this.traitRepo = traitRepo;
        this.personRepo = personRepo; this.mapper = mapper;
    }

    @GetMapping("/facts")
    public List<MemoryDto.FactResponse> getFacts(@PathVariable Long personId) { return factRepo.findByPersonId(personId).stream().map(mapper::toFactResponse).toList(); }

    @PostMapping("/facts")
    public MemoryDto.FactResponse createFact(@PathVariable Long personId, @RequestBody MemoryDto.FactRequest req) {
        Fact f = new Fact(); f.setPerson(personRepo.findById(personId).orElseThrow());
        f.setCategory(req.getCategory()); f.setKey(req.getKey()); f.setValue(req.getValue());
        f.setPeriod(req.getPeriod()); f.setConfidence(req.getConfidence());
        return mapper.toFactResponse(factRepo.save(f));
    }

    @DeleteMapping("/facts/{id}")
    public ResponseEntity<Void> deleteFact(@PathVariable Long id) { factRepo.deleteById(id); return ResponseEntity.noContent().build(); }

    @GetMapping("/episodes")
    public List<MemoryDto.EpisodeResponse> getEpisodes(@PathVariable Long personId) { return episodeRepo.findByPersonIdOrderByOccurredAtDesc(personId).stream().map(mapper::toEpisodeResponse).toList(); }

    @PostMapping("/episodes")
    public MemoryDto.EpisodeResponse createEpisode(@PathVariable Long personId, @RequestBody MemoryDto.EpisodeRequest req) {
        Episode e = new Episode(); e.setPerson(personRepo.findById(personId).orElseThrow());
        e.setSummary(req.getSummary()); e.setEmotion(req.getEmotion());
        e.setImportance(req.getImportance()); e.setOccurredAt(req.getOccurredAt());
        return mapper.toEpisodeResponse(episodeRepo.save(e));
    }

    @DeleteMapping("/episodes/{id}")
    public ResponseEntity<Void> deleteEpisode(@PathVariable Long id) { episodeRepo.deleteById(id); return ResponseEntity.noContent().build(); }

    @GetMapping("/chapters")
    public List<MemoryDto.ChapterResponse> getChapters(@PathVariable Long personId) { return chapterRepo.findByPersonIdOrderBySortOrderAsc(personId).stream().map(mapper::toChapterResponse).toList(); }

    @PostMapping("/chapters")
    public MemoryDto.ChapterResponse createChapter(@PathVariable Long personId, @RequestBody MemoryDto.ChapterRequest req) {
        LifeChapter c = new LifeChapter(); c.setPerson(personRepo.findById(personId).orElseThrow());
        c.setPeriod(req.getPeriod()); c.setTitle(req.getTitle()); c.setSummary(req.getSummary());
        c.setSentiment(req.getSentiment()); c.setSortOrder(req.getSortOrder());
        return mapper.toChapterResponse(chapterRepo.save(c));
    }

    @DeleteMapping("/chapters/{id}")
    public ResponseEntity<Void> deleteChapter(@PathVariable Long id) { chapterRepo.deleteById(id); return ResponseEntity.noContent().build(); }

    @GetMapping("/traits")
    public List<MemoryDto.TraitResponse> getTraits(@PathVariable Long personId) { return traitRepo.findByPersonId(personId).stream().map(mapper::toTraitResponse).toList(); }

    @PostMapping("/traits")
    public MemoryDto.TraitResponse createTrait(@PathVariable Long personId, @RequestBody MemoryDto.TraitRequest req) {
        PersonalityTrait t = new PersonalityTrait(); t.setPerson(personRepo.findById(personId).orElseThrow());
        t.setTrait(req.getTrait()); t.setDescription(req.getDescription());
        t.setEvidence(req.getEvidence()); t.setPeriod(req.getPeriod());
        return mapper.toTraitResponse(traitRepo.save(t));
    }

    @DeleteMapping("/traits/{id}")
    public ResponseEntity<Void> deleteTrait(@PathVariable Long id) { traitRepo.deleteById(id); return ResponseEntity.noContent().build(); }
}
