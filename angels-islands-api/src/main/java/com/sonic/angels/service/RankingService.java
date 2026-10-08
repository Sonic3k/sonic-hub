package com.sonic.angels.service;

import com.sonic.angels.model.dto.RankingDto;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.model.entity.Ranking;
import com.sonic.angels.model.entity.RankingEntry;
import com.sonic.angels.repository.PersonRepository;
import com.sonic.angels.repository.RankingEntryRepository;
import com.sonic.angels.repository.RankingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional
public class RankingService {

    private final RankingRepository rankingRepo;
    private final RankingEntryRepository entryRepo;
    private final PersonRepository personRepo;

    public RankingService(RankingRepository rankingRepo, RankingEntryRepository entryRepo, PersonRepository personRepo) {
        this.rankingRepo = rankingRepo; this.entryRepo = entryRepo; this.personRepo = personRepo;
    }

    @Transactional(readOnly = true)
    public List<RankingDto.Summary> list(String board) {
        Map<UUID, Long> counts = counts();
        List<Ranking> rs = board == null || board.isBlank() ? rankingRepo.findAllByOrderByBoardAscTakenOnAscPeriodAsc()
            : rankingRepo.findByBoardOrderByTakenOnAscPeriodAsc(board);
        return rs.stream().map(r -> summary(r, counts.getOrDefault(r.getId(), 0L))).toList();
    }

    @Transactional(readOnly = true)
    public RankingDto.Detail get(UUID id) {
        Ranking r = rankingRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Ranking not found: " + id));
        List<RankingEntry> rows = entryRepo.findByRankingWithPerson(id);
        RankingDto.Detail d = new RankingDto.Detail();
        fill(d, r, rows.size());
        d.setEntries(rows.stream().map(e -> entry(new RankingDto.Entry(), e)).toList());
        return d;
    }

    /** Every row this person has, in every ranking, with the ranking's header. */
    @Transactional(readOnly = true)
    public List<RankingDto.PersonEntry> forPerson(UUID personId) {
        Map<UUID, Long> counts = counts();
        return entryRepo.findByPersonWithRanking(personId).stream().map(e -> {
            RankingDto.PersonEntry pe = entry(new RankingDto.PersonEntry(), e);
            pe.setRanking(summary(e.getRanking(), counts.getOrDefault(e.getRanking().getId(), 0L)));
            return pe;
        }).toList();
    }

    /** Create the list, or replace all its rows when (board, period, variant) already exists. */
    public RankingDto.Summary upsert(RankingDto.Import req) {
        if (req.getBoard() == null || req.getBoard().isBlank() || req.getPeriod() == null || req.getPeriod().isBlank())
            throw new IllegalArgumentException("board and period are required");
        String variant = req.getVariant() == null ? "" : req.getVariant();
        Ranking r = rankingRepo.findByBoardAndPeriodAndVariant(req.getBoard(), req.getPeriod(), variant).orElseGet(Ranking::new);
        r.setBoard(req.getBoard()); r.setPeriod(req.getPeriod()); r.setVariant(variant);
        r.setTitle(req.getTitle()); r.setTakenOn(req.getTakenOn()); r.setSource(req.getSource()); r.setColumns(req.getColumns());
        r.getEntries().clear();
        if (r.getId() != null) rankingRepo.saveAndFlush(r);          // old rows go before the new ones come in
        Map<String, Optional<Person>> bySlug = new HashMap<>();
        int i = 0;
        for (RankingDto.ImportEntry in : req.getEntries() == null ? List.<RankingDto.ImportEntry>of() : req.getEntries()) {
            RankingEntry e = new RankingEntry();
            e.setRanking(r);
            Person p = null;
            if (in.getPersonId() != null) p = personRepo.findById(in.getPersonId()).orElse(null);
            else if (in.getPersonSlug() != null && !in.getPersonSlug().isBlank())
                p = bySlug.computeIfAbsent(in.getPersonSlug(), personRepo::findBySlug).orElse(null);
            e.setPerson(p);
            e.setLabel(in.getLabel() != null && !in.getLabel().isBlank() ? in.getLabel() : p != null ? p.getName() : "?");
            e.setRank(in.getRank()); e.setPoints(in.getPoints()); e.setPeriod(in.getPeriod());
            e.setMetrics(in.getMetrics()); e.setNote(in.getNote());
            e.setSortOrder(in.getSortOrder() != null ? in.getSortOrder() : i);
            r.getEntries().add(e);
            i++;
        }
        Ranking saved = rankingRepo.save(r);
        return summary(saved, saved.getEntries().size());
    }

    public void delete(UUID id) { rankingRepo.deleteById(id); }

    // ── mapping ──

    private Map<UUID, Long> counts() {
        Map<UUID, Long> m = new HashMap<>();
        for (Object[] row : rankingRepo.entryCounts()) m.put((UUID) row[0], ((Number) row[1]).longValue());
        return m;
    }

    private static RankingDto.Summary summary(Ranking r, long count) {
        RankingDto.Summary s = new RankingDto.Summary();
        fill(s, r, count);
        return s;
    }

    private static void fill(RankingDto.Summary s, Ranking r, long count) {
        s.setId(r.getId()); s.setBoard(r.getBoard()); s.setPeriod(r.getPeriod()); s.setVariant(r.getVariant());
        s.setTitle(r.getTitle()); s.setTakenOn(r.getTakenOn()); s.setSource(r.getSource()); s.setColumns(r.getColumns());
        s.setEntryCount(count);
    }

    private static <T extends RankingDto.Entry> T entry(T d, RankingEntry e) {
        d.setId(e.getId()); d.setLabel(e.getLabel()); d.setRank(e.getRank()); d.setPoints(e.getPoints());
        d.setPeriod(e.getPeriod()); d.setMetrics(e.getMetrics()); d.setNote(e.getNote());
        if (e.getPerson() != null) {
            d.setPersonId(e.getPerson().getId());
            d.setPersonName(e.getPerson().getDisplayName() != null ? e.getPerson().getDisplayName() : e.getPerson().getName());
        }
        return d;
    }
}
