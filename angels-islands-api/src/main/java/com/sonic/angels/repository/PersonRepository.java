package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Person;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public interface PersonRepository extends JpaRepository<Person, UUID> {
    java.util.Optional<Person> findByIsSelfTrue();
}
