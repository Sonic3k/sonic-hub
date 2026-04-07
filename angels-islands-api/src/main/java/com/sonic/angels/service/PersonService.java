package com.sonic.angels.service;

import com.sonic.angels.model.entity.Person;
import com.sonic.angels.repository.PersonRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class PersonService {

    private final PersonRepository personRepository;

    public PersonService(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    public List<Person> findAll() { return personRepository.findAll(); }
    public Person findById(Long id) { return personRepository.findById(id).orElseThrow(() -> new RuntimeException("Person not found: " + id)); }
    public Person save(Person person) { return personRepository.save(person); }
    public void delete(Long id) { personRepository.deleteById(id); }
}
