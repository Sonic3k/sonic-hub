package com.sonic.angels.controller;

import com.sonic.angels.config.AdminAuth;
import com.sonic.angels.model.dto.PersonDto;
import com.sonic.angels.service.PersonService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/persons")
public class PersonController {

    private final PersonService personService;
    private final AdminAuth adminAuth;

    public PersonController(PersonService personService, AdminAuth adminAuth) {
        this.personService = personService;
        this.adminAuth = adminAuth;
    }

    @GetMapping
    public List<PersonDto.Summary> findAll() { return personService.findAll(); }

    /** The relationship types this API stores, so a client can check before using one (e.g. ANGEL). */
    @GetMapping("/relationship-types")
    public List<String> relationshipTypes() {
        return java.util.Arrays.stream(com.sonic.angels.model.entity.Person.RelationshipType.values()).map(Enum::name).toList();
    }

    @GetMapping("/{id}")
    public PersonDto.DetailResponse findById(@PathVariable UUID id) {
        PersonDto.DetailResponse d = personService.findById(id);
        if (!adminAuth.isAdminRequest()) d.setContacts(List.of()); // phone numbers / handles are private
        return d;
    }

    @PostMapping
    public PersonDto.DetailResponse create(@RequestBody PersonDto.Request req) { return personService.create(req); }

    @PutMapping("/{id}")
    public PersonDto.DetailResponse update(@PathVariable UUID id, @RequestBody PersonDto.Request req) { return personService.update(id, req); }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) { personService.delete(id); return ResponseEntity.noContent().build(); }

    // ── Contacts ─────────────────────────────────────────────────────────────

    @GetMapping("/{id}/contacts")
    public List<PersonDto.ContactResponse> getContacts(@PathVariable UUID id) { return personService.getContacts(id); }

    @PostMapping("/{id}/contacts")
    public PersonDto.ContactResponse addContact(@PathVariable UUID id, @RequestBody PersonDto.ContactRequest req) { return personService.addContact(id, req); }

    @PutMapping("/{personId}/contacts/{contactId}")
    public PersonDto.ContactResponse updateContact(@PathVariable UUID personId, @PathVariable UUID contactId, @RequestBody PersonDto.ContactRequest req) { return personService.updateContact(contactId, req); }

    @DeleteMapping("/{personId}/contacts/{contactId}")
    public ResponseEntity<Void> deleteContact(@PathVariable UUID personId, @PathVariable UUID contactId) { personService.deleteContact(contactId); return ResponseEntity.noContent().build(); }
}
