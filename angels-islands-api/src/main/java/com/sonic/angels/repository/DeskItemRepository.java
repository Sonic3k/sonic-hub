package com.sonic.angels.repository;

import com.sonic.angels.model.entity.DeskItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeskItemRepository extends JpaRepository<DeskItem, UUID> {
    Optional<DeskItem> findByExternalKey(String externalKey);
    List<DeskItem> findByExternalKeyIn(Collection<String> keys);
    /** Every row with what it points at, for the in-memory picture of the devices. */
    @Query("SELECT i FROM DeskItem i LEFT JOIN FETCH i.device")
    List<DeskItem> loadAll();
}
