package com.sonic.hub.repository;

import com.sonic.hub.model.Entry;
import com.sonic.hub.model.EntryType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface EntryRepository extends JpaRepository<Entry, UUID> {

    List<Entry> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, UUID entityId);

    List<Entry> findByEntityTypeAndEntityIdAndEntryTypeOrderByCreatedAtDesc(
        String entityType, UUID entityId, EntryType entryType);

    List<Entry> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime after);

    List<Entry> findByEntityTypeAndEntityIdAndCreatedAtAfterOrderByCreatedAtDesc(
        String entityType, UUID entityId, LocalDateTime after);
}
