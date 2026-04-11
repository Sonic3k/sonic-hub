package com.sonic.angels.repository;

import com.sonic.angels.model.entity.PersonalityTrait;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PersonalityTraitRepository extends JpaRepository<PersonalityTrait, UUID> {
    List<PersonalityTrait> findByPersonId(UUID personId);
}
