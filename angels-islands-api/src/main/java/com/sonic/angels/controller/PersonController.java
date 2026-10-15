package com.sonic.angels.controller;

import com.sonic.angels.config.AdminAuth;
import com.sonic.angels.config.MysticAuth;
import com.sonic.angels.model.dto.PersonDto;
import com.sonic.angels.service.MysticClient;
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
    private final MysticAuth mysticAuth;
    private final MysticClient mystic;

    public PersonController(PersonService personService, AdminAuth adminAuth, MysticAuth mysticAuth, MysticClient mystic) {
        this.personService = personService;
        this.adminAuth = adminAuth;
        this.mysticAuth = mysticAuth;
        this.mystic = mystic;
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
        boolean admin = adminAuth.isAdminRequest();
        if (!admin) d.setContacts(List.of()); // phone numbers / handles are private
        if (!admin && !mysticAuth.isMysticRequest()) d.hidePrivateBirth(); // birth time and place: the owner and Mystic only
        return d;
    }

    /** a change is told to Mystic once it is saved (Mystic refreshes the person if it has them linked) */
    @PostMapping
    public PersonDto.DetailResponse create(@RequestBody PersonDto.Request req) {
        PersonDto.DetailResponse d = personService.create(req);
        mystic.personChanged(d.getId(), d);
        return d;
    }

    @PutMapping("/{id}")
    public PersonDto.DetailResponse update(@PathVariable UUID id, @RequestBody PersonDto.Request req) {
        PersonDto.DetailResponse d = personService.update(id, req);
        mystic.personChanged(id, d);
        return d;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        personService.delete(id);
        mystic.personDeleted(id);
        return ResponseEntity.noContent().build();
    }

    // ── Contacts ─────────────────────────────────────────────────────────────

    @GetMapping("/{id}/contacts")
    public List<PersonDto.ContactResponse> getContacts(@PathVariable UUID id) { return personService.getContacts(id); }

    @PostMapping("/{id}/contacts")
    public PersonDto.ContactResponse addContact(@PathVariable UUID id, @RequestBody PersonDto.ContactRequest req) { return personService.addContact(id, req); }

    @PutMapping("/{personId}/contacts/{contactId}")
    public PersonDto.ContactResponse updateContact(@PathVariable UUID personId, @PathVariable UUID contactId, @RequestBody PersonDto.ContactRequest req) { return personService.updateContact(contactId, req); }

    @DeleteMapping("/{personId}/contacts/{contactId}")
    public ResponseEntity<Void> deleteContact(@PathVariable UUID personId, @PathVariable UUID contactId) { personService.deleteContact(contactId); return ResponseEntity.noContent().build(); }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<java.util.Map<String, String>> bad(IllegalArgumentException e) {
        return ResponseEntity.status(400).body(java.util.Map.of("error", String.valueOf(e.getMessage())));
    }
}
