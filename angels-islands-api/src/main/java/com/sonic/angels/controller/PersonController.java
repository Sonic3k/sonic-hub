package com.sonic.angels.controller;

import com.sonic.angels.model.dto.PersonDto;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.service.DtoMapper;
import com.sonic.angels.service.PersonService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/persons")
public class PersonController {

    private final PersonService personService;
    private final DtoMapper mapper;

    public PersonController(PersonService personService, DtoMapper mapper) {
        this.personService = personService;
        this.mapper = mapper;
    }

    @GetMapping
    public List<PersonDto.Summary> findAll() {
        return personService.findAll().stream().map(mapper::toPersonSummary).toList();
    }

    @GetMapping("/{id}")
    public PersonDto.DetailResponse findById(@PathVariable UUID id) {
        return mapper.toPersonDetail(personService.findById(id));
    }

    @PostMapping
    public PersonDto.DetailResponse create(@RequestBody PersonDto.Request req) {
        Person p = new Person();
        applyRequest(p, req);
        return mapper.toPersonDetail(personService.save(p));
    }

    @PutMapping("/{id}")
    public PersonDto.DetailResponse update(@PathVariable UUID id, @RequestBody PersonDto.Request req) {
        Person p = personService.findById(id);
        applyRequest(p, req);
        return mapper.toPersonDetail(personService.save(p));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        personService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private void applyRequest(Person p, PersonDto.Request req) {
        if (req.getName() != null) p.setName(req.getName());
        if (req.getDisplayName() != null) p.setDisplayName(req.getDisplayName());
        if (req.getAlternativeName() != null) p.setAlternativeName(req.getAlternativeName());
        if (req.getNickname() != null) p.setNickname(req.getNickname());
        if (req.getDateOfBirth() != null) p.setDateOfBirth(req.getDateOfBirth());
        if (req.getBio() != null) p.setBio(req.getBio());
        if (req.getRelationshipType() != null) p.setRelationshipType(req.getRelationshipType());
        if (req.getPeriod() != null) p.setPeriod(req.getPeriod());
        if (req.getFirstMet() != null) p.setFirstMet(req.getFirstMet());
        if (req.getHowWeMet() != null) p.setHowWeMet(req.getHowWeMet());
        if (req.getSong() != null) p.setSong(req.getSong());
        if (req.getIsFavorite() != null) p.setIsFavorite(req.getIsFavorite());
        if (req.getIsFeatured() != null) p.setIsFeatured(req.getIsFeatured());
    }
}
