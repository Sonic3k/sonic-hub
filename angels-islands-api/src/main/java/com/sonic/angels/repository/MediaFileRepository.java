package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MediaFile;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MediaFileRepository extends JpaRepository<MediaFile, UUID> {
    @Query("SELECT m FROM MediaFile m JOIN m.persons p WHERE p.id = :personId ORDER BY m.effectiveDate DESC")
    List<MediaFile> findByPersonId(UUID personId);
}
