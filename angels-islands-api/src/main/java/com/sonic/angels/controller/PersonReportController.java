package com.sonic.angels.controller;

import com.sonic.angels.model.dto.PersonReportDto;
import com.sonic.angels.model.entity.PersonReport;
import com.sonic.angels.repository.PersonReportRepository;
import com.sonic.angels.repository.PersonRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/** The long write-ups about a person (see PersonReport): one per source, replaced as a whole by PUT. */
@RestController
@RequestMapping("/api/persons/{personId}/memory/reports")
public class PersonReportController {

    private static final Pattern SOURCE = Pattern.compile("^[a-z][a-z0-9-]{0,39}$");

    private final PersonRepository persons;
    private final PersonReportRepository reports;

    public PersonReportController(PersonRepository persons, PersonReportRepository reports) {
        this.persons = persons; this.reports = reports;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<PersonReportDto> list(@PathVariable UUID personId) {
        return reports.findByPersonIdOrderBySourceAsc(personId).stream().map(PersonReportController::dto).toList();
    }

    @PutMapping("/{source}")
    @Transactional
    public PersonReportDto put(@PathVariable UUID personId, @PathVariable String source, @RequestBody PersonReportDto in) {
        if (!SOURCE.matcher(source).matches()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "source: a-z, 0-9, - (max 40)");
        if (in.getContent() == null || in.getContent().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content is required");
        PersonReport r = reports.findByPersonIdAndSource(personId, source).orElseGet(() -> {
            PersonReport n = new PersonReport();
            n.setPerson(persons.findById(personId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "person not found")));
            n.setSource(source);
            return n;
        });
        String title = in.getTitle() == null || in.getTitle().isBlank() ? source : in.getTitle().trim();
        r.setTitle(title.length() > 255 ? title.substring(0, 255) : title);
        r.setContent(in.getContent());
        return dto(reports.saveAndFlush(r));
    }

    @DeleteMapping("/{source}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID personId, @PathVariable String source) {
        reports.findByPersonIdAndSource(personId, source).ifPresent(reports::delete);
        return ResponseEntity.noContent().build();
    }

    private static PersonReportDto dto(PersonReport r) {
        PersonReportDto d = new PersonReportDto();
        d.setId(r.getId()); d.setSource(r.getSource()); d.setTitle(r.getTitle()); d.setContent(r.getContent()); d.setUpdatedAt(r.getUpdatedAt());
        return d;
    }
}
