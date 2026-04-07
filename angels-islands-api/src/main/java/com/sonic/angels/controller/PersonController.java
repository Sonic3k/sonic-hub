package com.sonic.angels.controller;

import com.sonic.angels.model.entity.Person;
import com.sonic.angels.service.PersonService;
import com.sonic.angels.service.StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/persons")
public class PersonController {

    private final PersonService personService;
    private final StorageService storageService;

    public PersonController(PersonService personService, StorageService storageService) {
        this.personService = personService;
        this.storageService = storageService;
    }

    @GetMapping
    public List<Person> findAll() { return personService.findAll(); }

    @GetMapping("/{id}")
    public Person findById(@PathVariable Long id) { return personService.findById(id); }

    @PostMapping
    public Person create(@RequestBody Person person) { return personService.save(person); }

    @PutMapping("/{id}")
    public Person update(@PathVariable Long id, @RequestBody Person person) {
        Person existing = personService.findById(id);
        if (person.getName() != null) existing.setName(person.getName());
        if (person.getDisplayName() != null) existing.setDisplayName(person.getDisplayName());
        if (person.getAlternativeName() != null) existing.setAlternativeName(person.getAlternativeName());
        if (person.getNickname() != null) existing.setNickname(person.getNickname());
        if (person.getDateOfBirth() != null) existing.setDateOfBirth(person.getDateOfBirth());
        if (person.getBio() != null) existing.setBio(person.getBio());
        if (person.getRelationshipType() != null) existing.setRelationshipType(person.getRelationshipType());
        if (person.getPeriod() != null) existing.setPeriod(person.getPeriod());
        if (person.getFirstMet() != null) existing.setFirstMet(person.getFirstMet());
        if (person.getHowWeMet() != null) existing.setHowWeMet(person.getHowWeMet());
        if (person.getSong() != null) existing.setSong(person.getSong());
        if (person.getIsFavorite() != null) existing.setIsFavorite(person.getIsFavorite());
        if (person.getIsFeatured() != null) existing.setIsFeatured(person.getIsFeatured());
        return personService.save(existing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        personService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
