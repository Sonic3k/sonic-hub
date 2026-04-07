package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Fact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FactRepository extends JpaRepository<Fact, Long> {
    List<Fact> findByPersonId(Long personId);
    List<Fact> findByPersonIdAndCategory(Long personId, String category);
}
