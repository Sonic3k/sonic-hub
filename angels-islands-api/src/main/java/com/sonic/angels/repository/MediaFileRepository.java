package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MediaFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface MediaFileRepository extends JpaRepository<MediaFile, UUID> {
    boolean existsByStorageKey(String storageKey);

    @Query("SELECT m FROM MediaFile m JOIN m.persons p WHERE p.id = :personId ORDER BY m.effectiveDate DESC")
    List<MediaFile> findByPersonId(UUID personId);

    @Query("SELECT m FROM MediaFile m WHERE m.latitude IS NOT NULL AND m.longitude IS NOT NULL")
    Page<MediaFile> findWithLatLng(Pageable pageable);

    @Query("SELECT m FROM MediaFile m WHERE m.latitude IS NOT NULL AND m.longitude IS NOT NULL AND m.locationDetail IS NULL")
    Page<MediaFile> findWithLatLngNoLocation(Pageable pageable);

    @Query("SELECT COUNT(m) FROM MediaFile m WHERE m.latitude IS NOT NULL AND m.longitude IS NOT NULL AND m.locationDetail IS NULL")
    long countWithLatLngNoLocation();

    Page<MediaFile> findByStorageKeyIsNotNull(Pageable pageable);

    Page<MediaFile> findByIsFavoriteTrue(Pageable pageable);

    @Query("SELECT m FROM MediaFile m WHERE m.latitude IS NOT NULL AND m.longitude IS NOT NULL ORDER BY m.effectiveDate DESC")
    List<MediaFile> findGeotagged();

    @Query("SELECT m FROM MediaFile m WHERE m.storageKey IS NOT NULL AND (SELECT COUNT(t) FROM m.tags t WHERE t.name = 'CLASSIFIED') = 0")
    Page<MediaFile> findUnscanned(Pageable pageable);

    @Modifying
    @Query(value = "DELETE FROM collection_media WHERE media_file_id = :mediaId", nativeQuery = true)
    void removeFromAllCollections(UUID mediaId);
}
