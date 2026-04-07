package com.sonic.angels.controller;

import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/persons/{personId}/memory")
public class MemoryController {

    private final FactRepository factRepository;
    private final EpisodeRepository episodeRepository;
    private final LifeChapterRepository lifeChapterRepository;
    private final PersonalityTraitRepository personalityTraitRepository;
    private final PersonRepository personRepository;

    public MemoryController(FactRepository factRepository, EpisodeRepository episodeRepository,
                            LifeChapterRepository lifeChapterRepository, PersonalityTraitRepository personalityTraitRepository,
                            PersonRepository personRepository) {
        this.factRepository = factRepository;
        this.episodeRepository = episodeRepository;
        this.lifeChapterRepository = lifeChapterRepository;
        this.personalityTraitRepository = personalityTraitRepository;
        this.personRepository = personRepository;
    }

    // ── Facts ────────────────────────────────────────────────────────────────

    @GetMapping("/facts")
    public List<Fact> getFacts(@PathVariable Long personId) { return factRepository.findByPersonId(personId); }

    @PostMapping("/facts")
    public Fact createFact(@PathVariable Long personId, @RequestBody Fact fact) {
        fact.setPerson(personRepository.findById(personId).orElseThrow());
        return factRepository.save(fact);
    }

    @DeleteMapping("/facts/{id}")
    public ResponseEntity<Void> deleteFact(@PathVariable Long id) { factRepository.deleteById(id); return ResponseEntity.noContent().build(); }

    // ── Episodes ─────────────────────────────────────────────────────────────

    @GetMapping("/episodes")
    public List<Episode> getEpisodes(@PathVariable Long personId) { return episodeRepository.findByPersonIdOrderByOccurredAtDesc(personId); }

    @PostMapping("/episodes")
    public Episode createEpisode(@PathVariable Long personId, @RequestBody Episode episode) {
        episode.setPerson(personRepository.findById(personId).orElseThrow());
        return episodeRepository.save(episode);
    }

    @DeleteMapping("/episodes/{id}")
    public ResponseEntity<Void> deleteEpisode(@PathVariable Long id) { episodeRepository.deleteById(id); return ResponseEntity.noContent().build(); }

    // ── Life Chapters ────────────────────────────────────────────────────────

    @GetMapping("/chapters")
    public List<LifeChapter> getChapters(@PathVariable Long personId) { return lifeChapterRepository.findByPersonIdOrderBySortOrderAsc(personId); }

    @PostMapping("/chapters")
    public LifeChapter createChapter(@PathVariable Long personId, @RequestBody LifeChapter chapter) {
        chapter.setPerson(personRepository.findById(personId).orElseThrow());
        return lifeChapterRepository.save(chapter);
    }

    @DeleteMapping("/chapters/{id}")
    public ResponseEntity<Void> deleteChapter(@PathVariable Long id) { lifeChapterRepository.deleteById(id); return ResponseEntity.noContent().build(); }

    // ── Personality Traits ───────────────────────────────────────────────────

    @GetMapping("/traits")
    public List<PersonalityTrait> getTraits(@PathVariable Long personId) { return personalityTraitRepository.findByPersonId(personId); }

    @PostMapping("/traits")
    public PersonalityTrait createTrait(@PathVariable Long personId, @RequestBody PersonalityTrait trait) {
        trait.setPerson(personRepository.findById(personId).orElseThrow());
        return personalityTraitRepository.save(trait);
    }

    @DeleteMapping("/traits/{id}")
    public ResponseEntity<Void> deleteTrait(@PathVariable Long id) { personalityTraitRepository.deleteById(id); return ResponseEntity.noContent().build(); }
}
