package com.sonic.hub.repository;

import com.sonic.hub.model.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface TagRepository extends JpaRepository<Tag, UUID> {
    Optional<Tag> findByName(String name);
    boolean existsByName(String name);
    Set<Tag> findAllByIdIn(Set<UUID> ids);
}
