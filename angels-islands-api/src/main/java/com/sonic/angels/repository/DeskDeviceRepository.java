package com.sonic.angels.repository;

import com.sonic.angels.model.entity.DeskDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeskDeviceRepository extends JpaRepository<DeskDevice, UUID> {
    Optional<DeskDevice> findByExternalKey(String externalKey);
    List<DeskDevice> findByExternalKeyIn(Collection<String> keys);
    /** Every row with what it points at, for the in-memory picture of the devices. */
    @Query("SELECT d FROM DeskDevice d LEFT JOIN FETCH d.photo")
    List<DeskDevice> loadAll();
}
