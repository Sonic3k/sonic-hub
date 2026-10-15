package com.sonic.angels.controller;

import com.sonic.angels.config.MysticAuth;
import com.sonic.angels.model.dto.MysticBriefDto;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.model.entity.PersonMysticBrief;
import com.sonic.angels.repository.PersonMysticBriefRepository;
import com.sonic.angels.repository.PersonRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * The Mystic briefs of a person. Mystic pushes them (PUT / DELETE, signed with MYSTIC_SYNC_TOKEN); the person page
 * reads them (GET — private: it needs the admin token when one is set, see AdminTokenFilter).
 */
@RestController
@RequestMapping("/api/persons/{personId}/mystic-briefs")
public class MysticBriefController {

    private static final Pattern DISCIPLINE = Pattern.compile("^[a-z][a-z0-9-]{1,39}$");
    private static final int MAX_FACTS = 24, MAX_LINES = 24;

    private final PersonRepository persons;
    private final PersonMysticBriefRepository briefs;
    private final MysticAuth mystic;

    public MysticBriefController(PersonRepository persons, PersonMysticBriefRepository briefs, MysticAuth mystic) {
        this.persons = persons;
        this.briefs = briefs;
        this.mystic = mystic;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<MysticBriefDto> list(@PathVariable UUID personId) {
        return briefs.findByPersonIdOrderByDisciplineAsc(personId).stream().map(MysticBriefController::dto).toList();
    }

    @PutMapping("/{discipline}")
    @Transactional
    public MysticBriefDto put(@PathVariable UUID personId, @PathVariable String discipline, @RequestBody MysticBriefDto in, HttpServletRequest req) {
        signed(req);
        if (!DISCIPLINE.matcher(discipline).matches()) throw new IllegalArgumentException("bad discipline: " + discipline);
        if (in.getTitle() == null || in.getTitle().isBlank()) throw new IllegalArgumentException("title is required");
        Person p = persons.findById(personId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Person not found: " + personId));
        PersonMysticBrief b = briefs.findByPersonIdAndDiscipline(personId, discipline).orElseGet(PersonMysticBrief::new);
        b.setPerson(p);
        b.setDiscipline(discipline);
        b.setTitle(cut(in.getTitle(), 255));
        b.setSubjectId(cut(in.getSubjectId(), 64));
        b.setProfileId(cut(in.getProfileId(), 64));
        b.setProfileLabel(cut(in.getProfileLabel(), 255));
        b.setUrl(cut(in.getUrl(), 500));
        b.setSourceUpdatedAt(in.getUpdatedAt());
        b.getFacts().clear();
        if (in.getFacts() != null) in.getFacts().stream().filter(f -> f != null && f.label() != null && f.value() != null).limit(MAX_FACTS)
            .forEach(f -> b.getFacts().add(new PersonMysticBrief.BriefFact(cut(f.label(), 120), cut(f.value(), 500))));
        b.getLines().clear();
        if (in.getLines() != null) in.getLines().stream().filter(l -> l != null && l.text() != null && !l.text().isBlank()).limit(MAX_LINES)
            .forEach(l -> b.getLines().add(new PersonMysticBrief.BriefLine("primary".equals(l.layer()) ? "primary" : "added", l.text(), cut(l.source(), 120))));
        return dto(briefs.save(b));
    }

    @DeleteMapping("/{discipline}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID personId, @PathVariable String discipline, HttpServletRequest req) {
        signed(req);
        briefs.deleteByPersonIdAndDiscipline(personId, discipline);
        return ResponseEntity.noContent().build();
    }

    private void signed(HttpServletRequest req) {
        if (!mystic.isConfigured()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "MYSTIC_SYNC_TOKEN is not set");
        if (!mystic.matches(req.getHeader(MysticAuth.HEADER))) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "sync token required");
    }

    private static String cut(String s, int max) { return s == null ? null : s.length() <= max ? s : s.substring(0, max); }

    private static MysticBriefDto dto(PersonMysticBrief b) {
        MysticBriefDto d = new MysticBriefDto();
        d.setDiscipline(b.getDiscipline()); d.setTitle(b.getTitle()); d.setSubjectId(b.getSubjectId()); d.setProfileId(b.getProfileId());
        d.setProfileLabel(b.getProfileLabel()); d.setUrl(b.getUrl()); d.setUpdatedAt(b.getSourceUpdatedAt()); d.setReceivedAt(b.getUpdatedAt());
        d.setFacts(b.getFacts().stream().map(f -> new MysticBriefDto.Fact(f.getLabel(), f.getValue())).toList());
        d.setLines(b.getLines().stream().map(l -> new MysticBriefDto.Line(l.getLayer(), l.getText(), l.getSource())).toList());
        return d;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> bad(IllegalArgumentException e) {
        return ResponseEntity.status(400).body(Map.of("error", String.valueOf(e.getMessage())));
    }
}
