package com.sonic.angels.service;

import com.sonic.angels.model.dto.MemoryDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Memory written by an import (chat analysis, AI extraction…) is tagged with its source, so a re-run replaces
 *  exactly what that source wrote before — and nothing typed in by hand. */
@Service
@Transactional
public class MemoryImportService {

    private final PersonRepository personRepo;
    private final LifeChapterRepository chapterRepo;
    private final FactRepository factRepo;
    private final PersonalityTraitRepository traitRepo;
    private final EpisodeRepository episodeRepo;
    private final MemoryService memory;
    private final LifeEventRepository lifeEventRepo;

    public MemoryImportService(PersonRepository personRepo, LifeChapterRepository chapterRepo, FactRepository factRepo,
                               PersonalityTraitRepository traitRepo, EpisodeRepository episodeRepo, MemoryService memory, LifeEventRepository lifeEventRepo) {
        this.lifeEventRepo = lifeEventRepo;
        this.personRepo = personRepo; this.chapterRepo = chapterRepo; this.factRepo = factRepo;
        this.traitRepo = traitRepo; this.episodeRepo = episodeRepo; this.memory = memory;
    }

    /** an import writes drafts unless it says its items are checked */
    private static MemoryStatus statusOr(String v) { MemoryStatus s = MemoryService.status(v); return s != null ? s : MemoryStatus.DRAFT; }

    public Map<String, Object> replace(UUID personId, String source, MemoryDto.SourceImport req) {
        if (source == null || source.isBlank()) throw new IllegalArgumentException("source is required");
        Person person = personRepo.findById(personId).orElseThrow(() -> new IllegalArgumentException("Person not found: " + personId));
        Map<String, Object> out = new LinkedHashMap<>();
        if (req.getChapters() != null) {
            int removed = chapterRepo.deleteByPersonAndSource(personId, source);
            for (MemoryDto.ChapterRequest r : req.getChapters()) {
                LifeChapter c = new LifeChapter(); c.setPerson(person); c.setSource(source);
                c.setPeriod(r.getPeriod() == null ? "" : r.getPeriod()); c.setTitle(r.getTitle()); c.setSummary(r.getSummary());
                c.setSentiment(r.getSentiment()); c.setSortOrder(r.getSortOrder()); c.setStatus(statusOr(r.getStatus()));
                chapterRepo.save(c);
            }
            out.put("chapters", counts(removed, req.getChapters()));
        }
        if (req.getFacts() != null) {
            int removed = factRepo.deleteByPersonAndSource(personId, source);
            for (MemoryDto.FactRequest r : req.getFacts()) {
                Fact f = new Fact(); f.setPerson(person); f.setSource(source);
                f.setCategory(r.getCategory() == null ? "basic" : r.getCategory()); f.setKey(r.getKey() == null ? "" : r.getKey());
                f.setValue(r.getValue() == null ? "" : r.getValue()); f.setPeriod(r.getPeriod());
                if (r.getConfidence() != null) f.setConfidence(r.getConfidence());
                f.setStatus(statusOr(r.getStatus()));
                factRepo.save(f);
            }
            out.put("facts", counts(removed, req.getFacts()));
        }
        if (req.getTraits() != null) {
            int removed = traitRepo.deleteByPersonAndSource(personId, source);
            for (MemoryDto.TraitRequest r : req.getTraits()) {
                PersonalityTrait t = new PersonalityTrait(); t.setPerson(person); t.setSource(source);
                t.setTrait(r.getTrait()); t.setDescription(r.getDescription()); t.setEvidence(r.getEvidence()); t.setPeriod(r.getPeriod());
                t.setStatus(statusOr(r.getStatus()));
                traitRepo.save(t);
            }
            out.put("traits", counts(removed, req.getTraits()));
        }
        if (req.getEpisodes() != null) {
            // the event each memory belongs to, by its stable key: a re-import keeps the link
            Map<String, UUID> eventOf = new HashMap<>();
            for (Object[] row : episodeRepo.eventLinksOfSource(personId, source)) eventOf.put((String) row[0], UUID.fromString((String) row[1]));
            // the bulk delete skips the link tables, so they go first
            episodeRepo.unlinkMediaOfSource(personId, source); episodeRepo.unlinkCollectionsOfSource(personId, source);
            episodeRepo.unlinkTagsOfSource(personId, source); episodeRepo.unlinkPersonsOfSource(personId, source);
            episodeRepo.deleteSourcesOfSource(personId, source);
            int removed = episodeRepo.deleteByPersonAndSource(personId, source);
            for (MemoryDto.EpisodeRequest r : req.getEpisodes()) {
                Episode e = memory.newEpisode(person, source, r, statusOr(r.getStatus()));
                UUID ev = e.getExternalKey() != null ? eventOf.get(e.getExternalKey()) : null;
                if (ev != null) lifeEventRepo.findById(ev).ifPresent(e::setLifeEvent);
            }
            out.put("episodes", counts(removed, req.getEpisodes()));
        }
        return out;
    }

    private static Map<String, Integer> counts(int removed, List<?> added) {
        return Map.of("removed", removed, "added", added.size());
    }
}
