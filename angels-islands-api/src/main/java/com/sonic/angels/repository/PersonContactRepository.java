package com.sonic.angels.repository;

import com.sonic.angels.model.entity.PersonContact;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PersonContactRepository extends JpaRepository<PersonContact, UUID> {
    List<PersonContact> findByPersonId(UUID personId);
    Optional<PersonContact> findByPlatformAndIdentifier(PersonContact.Platform platform, String identifier);
    List<PersonContact> findByPlatform(PersonContact.Platform platform);
}
