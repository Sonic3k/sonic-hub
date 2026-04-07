package com.sonic.angels.repository;

import com.sonic.angels.model.entity.PersonalityTrait;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PersonalityTraitRepository extends JpaRepository<PersonalityTrait, Long> {
    List<PersonalityTrait> findByPersonId(Long personId);
}
