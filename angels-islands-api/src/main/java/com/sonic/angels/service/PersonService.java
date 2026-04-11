package com.sonic.angels.service;

import com.sonic.angels.model.entity.Person;
import com.sonic.angels.repository.PersonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class PersonService {

    private final PersonRepository personRepository;

    public PersonService(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    @Transactional(readOnly = true)
    public List<Person> findAll() { return personRepository.findAll(); }

    @Transactional(readOnly = true)
    public Person findById(UUID id) { return personRepository.findById(id).orElseThrow(() -> new RuntimeException("Person not found: " + id)); }

    @Transactional
    public Person save(Person person) { return personRepository.save(person); }

    @Transactional
    public void delete(UUID id) { personRepository.deleteById(id); }
}
