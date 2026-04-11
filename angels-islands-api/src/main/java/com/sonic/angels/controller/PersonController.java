package com.sonic.angels.controller;

import com.sonic.angels.model.dto.PersonDto;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.model.entity.PersonContact;
import com.sonic.angels.repository.PersonContactRepository;
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
    private final PersonContactRepository contactRepo;
    private final DtoMapper mapper;

    public PersonController(PersonService personService, PersonContactRepository contactRepo, DtoMapper mapper) {
        this.personService = personService;
        this.contactRepo = contactRepo;
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
        if (req.getIsSelf() != null) p.setIsSelf(req.getIsSelf());
        if (req.getIsFavorite() != null) p.setIsFavorite(req.getIsFavorite());
        if (req.getIsFeatured() != null) p.setIsFeatured(req.getIsFeatured());
    }

    // ── Contacts ─────────────────────────────────────────────────────────────

    @GetMapping("/{id}/contacts")
    public List<PersonDto.ContactResponse> getContacts(@PathVariable UUID id) {
        return contactRepo.findByPersonId(id).stream().map(mapper::toContactResponse).toList();
    }

    @PostMapping("/{id}/contacts")
    public PersonDto.ContactResponse addContact(@PathVariable UUID id, @RequestBody PersonDto.ContactRequest req) {
        Person p = personService.findById(id);
        PersonContact c = new PersonContact();
        c.setPerson(p);
        c.setPlatform(PersonContact.Platform.valueOf(req.getPlatform()));
        c.setIdentifier(req.getIdentifier());
        c.setDisplayName(req.getDisplayName());
        c.setNotes(req.getNotes());
        return mapper.toContactResponse(contactRepo.save(c));
    }

    @PutMapping("/{personId}/contacts/{contactId}")
    public PersonDto.ContactResponse updateContact(@PathVariable UUID personId, @PathVariable UUID contactId,
                                                    @RequestBody PersonDto.ContactRequest req) {
        PersonContact c = contactRepo.findById(contactId).orElseThrow();
        if (req.getPlatform() != null) c.setPlatform(PersonContact.Platform.valueOf(req.getPlatform()));
        if (req.getIdentifier() != null) c.setIdentifier(req.getIdentifier());
        if (req.getDisplayName() != null) c.setDisplayName(req.getDisplayName());
        if (req.getNotes() != null) c.setNotes(req.getNotes());
        return mapper.toContactResponse(contactRepo.save(c));
    }

    @DeleteMapping("/{personId}/contacts/{contactId}")
    public ResponseEntity<Void> deleteContact(@PathVariable UUID personId, @PathVariable UUID contactId) {
        contactRepo.deleteById(contactId);
        return ResponseEntity.noContent().build();
    }
}
