package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MediaFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface MediaFileRepository extends JpaRepository<MediaFile, UUID> {
    @Query("SELECT m FROM MediaFile m JOIN m.persons p WHERE p.id = :personId ORDER BY m.effectiveDate DESC")
    List<MediaFile> findByPersonId(UUID personId);

    @Modifying
    @Query(value = "DELETE FROM collection_media WHERE media_file_id = :mediaId", nativeQuery = true)
    void removeFromAllCollections(UUID mediaId);
}
