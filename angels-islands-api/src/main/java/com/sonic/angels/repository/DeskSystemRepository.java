package com.sonic.angels.repository;

import com.sonic.angels.model.entity.DeskSystem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeskSystemRepository extends JpaRepository<DeskSystem, UUID> {
    Optional<DeskSystem> findByExternalKey(String externalKey);
    List<DeskSystem> findByExternalKeyIn(Collection<String> keys);
    /** Every row with what it points at, for the in-memory picture of the devices. */
    @Query("SELECT s FROM DeskSystem s JOIN FETCH s.device")
    List<DeskSystem> loadAll();
}
