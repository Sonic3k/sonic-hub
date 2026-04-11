package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Fact;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FactRepository extends JpaRepository<Fact, UUID> {
    List<Fact> findByPersonId(UUID personId);
    List<Fact> findByPersonIdAndCategory(UUID personId, String category);
}
