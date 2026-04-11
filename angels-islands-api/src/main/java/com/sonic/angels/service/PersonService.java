package com.sonic.angels.service;

import com.sonic.angels.model.dto.PersonDto;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.model.entity.PersonContact;
import com.sonic.angels.repository.PersonContactRepository;
import com.sonic.angels.repository.PersonRepository;
import com.sonic.angels.repository.TagRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PersonService {

    private final PersonRepository personRepository;
    private final PersonContactRepository contactRepository;
    private final TagRepository tagRepository;
    private final DtoMapper mapper;

    public PersonService(PersonRepository personRepository, PersonContactRepository contactRepository,
                         TagRepository tagRepository, DtoMapper mapper) {
        this.personRepository = personRepository;
        this.contactRepository = contactRepository;
        this.tagRepository = tagRepository;
        this.mapper = mapper;
    }

    // ── Queries ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PersonDto.Summary> findAll() {
        return personRepository.findAll().stream().map(mapper::toPersonSummary).toList();
    }

    @Transactional(readOnly = true)
    public PersonDto.DetailResponse findById(UUID id) {
        return mapper.toPersonDetail(getEntity(id));
    }

    public Person getEntity(UUID id) {
        return personRepository.findById(id).orElseThrow(() -> new RuntimeException("Person not found: " + id));
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    public PersonDto.DetailResponse create(PersonDto.Request req) {
        Person p = new Person();
        applyRequest(p, req);
        return mapper.toPersonDetail(personRepository.save(p));
    }

    public PersonDto.DetailResponse update(UUID id, PersonDto.Request req) {
        Person p = getEntity(id);
        applyRequest(p, req);
        return mapper.toPersonDetail(personRepository.save(p));
    }

    public void delete(UUID id) {
        personRepository.deleteById(id);
    }

    // ── Contacts ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PersonDto.ContactResponse> getContacts(UUID personId) {
        return contactRepository.findByPersonId(personId).stream().map(mapper::toContactResponse).toList();
    }

    public PersonDto.ContactResponse addContact(UUID personId, PersonDto.ContactRequest req) {
        Person p = getEntity(personId);
        PersonContact c = new PersonContact();
        c.setPerson(p);
        c.setPlatform(PersonContact.Platform.valueOf(req.getPlatform()));
        c.setIdentifier(req.getIdentifier());
        c.setDisplayName(req.getDisplayName());
        c.setNotes(req.getNotes());
        return mapper.toContactResponse(contactRepository.save(c));
    }

    public PersonDto.ContactResponse updateContact(UUID contactId, PersonDto.ContactRequest req) {
        PersonContact c = contactRepository.findById(contactId)
            .orElseThrow(() -> new RuntimeException("Contact not found: " + contactId));
        if (req.getPlatform() != null) c.setPlatform(PersonContact.Platform.valueOf(req.getPlatform()));
        if (req.getIdentifier() != null) c.setIdentifier(req.getIdentifier());
        if (req.getDisplayName() != null) c.setDisplayName(req.getDisplayName());
        if (req.getNotes() != null) c.setNotes(req.getNotes());
        return mapper.toContactResponse(contactRepository.save(c));
    }

    public void deleteContact(UUID contactId) {
        contactRepository.deleteById(contactId);
    }

    // ── Internal ─────────────────────────────────────────────────────────────

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
        if (req.getTagIds() != null) {
            p.setTags(new HashSet<>(tagRepository.findAllById(req.getTagIds())));
        }
    }
}
