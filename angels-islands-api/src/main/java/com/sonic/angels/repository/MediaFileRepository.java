package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MediaFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MediaFileRepository extends JpaRepository<MediaFile, Long> {
    @Query("SELECT m FROM MediaFile m JOIN m.persons p WHERE p.id = :personId ORDER BY m.effectiveDate DESC")
    List<MediaFile> findByPersonId(Long personId);
}
