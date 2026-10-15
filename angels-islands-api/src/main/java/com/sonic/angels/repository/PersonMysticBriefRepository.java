package com.sonic.angels.repository;

import com.sonic.angels.model.entity.PersonMysticBrief;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PersonMysticBriefRepository extends JpaRepository<PersonMysticBrief, UUID> {
    List<PersonMysticBrief> findByPersonIdOrderByDisciplineAsc(UUID personId);
    Optional<PersonMysticBrief> findByPersonIdAndDiscipline(UUID personId, String discipline);
    /** derived delete: loads and removes each brief, so its facts and lines go too */
    void deleteByPersonId(UUID personId);
    void deleteByPersonIdAndDiscipline(UUID personId, String discipline);
}
