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
 *  exactly what that source wrote before — and nothing typed in by hand. A re-run writes each memory as a new row (a
 *  new id); what points at a memory from outside the import — its event, the games and the songs linked to it — is
 *  carried over to the row that has the same external key. */
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
    private final GameRepository gameRepo;
    private final GameMemoryRepository gameMemoryRepo;
    private final MusicTrackRepository trackRepo;
    private final MusicTrackMemoryRepository trackMemoryRepo;

    public MemoryImportService(PersonRepository personRepo, LifeChapterRepository chapterRepo, FactRepository factRepo,
                               PersonalityTraitRepository traitRepo, EpisodeRepository episodeRepo, MemoryService memory, LifeEventRepository lifeEventRepo,
                               GameRepository gameRepo, GameMemoryRepository gameMemoryRepo, MusicTrackRepository trackRepo,
                               MusicTrackMemoryRepository trackMemoryRepo) {
        this.gameRepo = gameRepo; this.gameMemoryRepo = gameMemoryRepo; this.trackRepo = trackRepo; this.trackMemoryRepo = trackMemoryRepo;
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
            // so do the games and the songs linked to a memory: a re-import writes the memory as a new row, and the links
            // (which go with the old row) are put back on the one that carries the same key
            List<Object[]> gameLinks = episodeRepo.gameLinksOfSource(personId, source);
            List<Object[]> trackLinks = episodeRepo.trackLinksOfSource(personId, source);
            // the bulk delete skips the link tables, so they go first
            episodeRepo.unlinkMediaOfSource(personId, source); episodeRepo.unlinkCollectionsOfSource(personId, source);
            episodeRepo.unlinkTagsOfSource(personId, source); episodeRepo.unlinkPersonsOfSource(personId, source);
            episodeRepo.deleteSourcesOfSource(personId, source);
            int removed = episodeRepo.deleteByPersonAndSource(personId, source);
            Map<String, Episode> byKey = new HashMap<>();
            for (MemoryDto.EpisodeRequest r : req.getEpisodes()) {
                Episode e = memory.newEpisode(person, source, r, statusOr(r.getStatus()));
                if (e.getExternalKey() != null) byKey.putIfAbsent(e.getExternalKey(), e);
                UUID ev = e.getExternalKey() != null ? eventOf.get(e.getExternalKey()) : null;
                if (ev != null) lifeEventRepo.findById(ev).ifPresent(e::setLifeEvent);
            }
            int relinked = 0;
            for (Object[] row : gameLinks) {
                Episode e = byKey.get((String) row[0]);
                if (e == null) continue;      // the memory is not in this import any more: its links went with it
                GameMemory gm = new GameMemory();
                gm.setGame(gameRepo.getReferenceById(UUID.fromString((String) row[1]))); gm.setEpisode(e);
                gm.setSortOrder(row[2] == null ? null : ((Number) row[2]).intValue());
                gameMemoryRepo.save(gm); relinked++;
            }
            for (Object[] row : trackLinks) {
                Episode e = byKey.get((String) row[0]);
                if (e == null) continue;
                MusicTrackMemory tm = new MusicTrackMemory();
                tm.setTrack(trackRepo.getReferenceById(UUID.fromString((String) row[1]))); tm.setEpisode(e);
                if (row[2] != null) tm.setRole(MusicTrackMemory.Role.valueOf((String) row[2]));
                tm.setNote((String) row[3]); tm.setSortOrder(row[4] == null ? null : ((Number) row[4]).intValue());
                trackMemoryRepo.save(tm); relinked++;
            }
            Map<String, Integer> c = new LinkedHashMap<>(counts(removed, req.getEpisodes()));
            c.put("relinked", relinked);
            out.put("episodes", c);
        }
        return out;
    }

    private static Map<String, Integer> counts(int removed, List<?> added) {
        return Map.of("removed", removed, "added", added.size());
    }
}
