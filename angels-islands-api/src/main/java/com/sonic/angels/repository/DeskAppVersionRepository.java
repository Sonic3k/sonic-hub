package com.sonic.angels.repository;

import com.sonic.angels.model.entity.DeskAppVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeskAppVersionRepository extends JpaRepository<DeskAppVersion, UUID> {
    Optional<DeskAppVersion> findByExternalKey(String externalKey);
    List<DeskAppVersion> findByExternalKeyIn(Collection<String> keys);
    /** Every row with what it points at, for the in-memory picture of the devices. */
    @Query("SELECT a FROM DeskAppVersion a LEFT JOIN FETCH a.device")
    List<DeskAppVersion> loadAll();
}
