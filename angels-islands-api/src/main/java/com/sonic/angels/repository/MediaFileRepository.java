package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MediaFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    java.util.Optional<MediaFile> findFirstByContentHash(String contentHash);

    @Query("SELECT m FROM MediaFile m LEFT JOIN FETCH m.imageDetail WHERE m.mediaSource IS NULL")
    List<MediaFile> findSourcelessWithDetail();

    @Modifying
    @Query(value = "UPDATE media_files SET file_extension = LOWER((regexp_match(file_name, '\\.([A-Za-z0-9]{1,15})$'))[1]) " +
        "WHERE file_extension IS NULL AND file_name ~ '\\.[A-Za-z0-9]{1,15}$'", nativeQuery = true)
    int backfillFileExtension();

    @Query(value = "SELECT file_extension, COUNT(*) FROM media_files WHERE file_extension IS NOT NULL " +
        "GROUP BY file_extension ORDER BY COUNT(*) DESC", nativeQuery = true)
    List<Object[]> countByExtension();

    /** One-shot migration: retire the legacy ORIGINAL default (null now means unknown). */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "UPDATE media_files SET media_source = NULL WHERE media_source = 'ORIGINAL'", nativeQuery = true)
    int clearOriginalSource();

    @Query("SELECT m FROM MediaFile m WHERE m.latitude IS NOT NULL AND m.longitude IS NOT NULL ORDER BY m.effectiveDate DESC")
    List<MediaFile> findGeotagged();

    @Query("SELECT m FROM MediaFile m WHERE m.storageKey IS NOT NULL AND (SELECT COUNT(t) FROM m.tags t WHERE t.name = 'CLASSIFIED') = 0")
    Page<MediaFile> findUnscanned(Pageable pageable);

    @Modifying
    @Query(value = "DELETE FROM collection_media WHERE media_file_id = :mediaId", nativeQuery = true)
    void removeFromAllCollections(UUID mediaId);

    // ── Super search: one shared WHERE, sorted + random variants ─────────────
    // Optional scalars use (:x IS NULL OR ...) null-guards; list/uuid filters use
    // boolean guards + EXISTS / NOT EXISTS subqueries (safe with empty lists,
    // no joins on the root query -> no DISTINCT needed, Pageable sort just works).
    String SEARCH_WHERE =
        " WHERE (:type IS NULL OR m.fileType = :type)" +
        " AND (:orientation IS NULL OR m.orientation = :orientation)" +
        " AND (:category IS NULL OR m.mediaCategory = :category)" +
        " AND (:source IS NULL OR m.mediaSource = :source)" +
        " AND (:ext IS NULL OR m.fileExtension = :ext)" +
        " AND (:favorite IS NULL OR m.isFavorite = :favorite)" +
        " AND (:featured IS NULL OR m.isFeatured = :featured)" +
        " AND (:hasGps IS NULL OR (:hasGps = true AND m.latitude IS NOT NULL) OR (:hasGps = false AND m.latitude IS NULL))" +
        " AND (:hasPerson = false" +
        "   OR EXISTS (SELECT 1 FROM MediaFile mp JOIN mp.persons pp WHERE mp.id = m.id AND pp.id = :personId)" +
        "   OR EXISTS (SELECT 1 FROM Collection cc JOIN cc.mediaFiles cm JOIN cc.persons cp WHERE cm.id = m.id AND cp.id = :personId))" +
        " AND (:hasTakenBy = false OR EXISTS (" +
        "   SELECT 1 FROM MediaFile mtb WHERE mtb.id = m.id AND mtb.takenBy.id = :takenById))" +
        " AND (:hasCollection = false OR EXISTS (" +
        "   SELECT 1 FROM Collection col JOIN col.mediaFiles colm WHERE col.id = :collectionId AND colm.id = m.id))" +
        " AND (:hasInclude = false OR EXISTS (" +
        "   SELECT 1 FROM MediaFile mi JOIN mi.tags ti WHERE mi.id = m.id AND (ti.id IN :tagIds OR ti.name IN :tagNames)))" +
        " AND (:hasExclude = false OR NOT EXISTS (" +
        "   SELECT 1 FROM MediaFile mx JOIN mx.tags tx WHERE mx.id = m.id AND (tx.id IN :excludeTagIds OR tx.name IN :excludeTagNames)))" +
        " AND (:hasQuery = false OR (LOWER(m.fileName) LIKE :query OR LOWER(m.caption) LIKE :query" +
        "   OR LOWER(m.displayedAddress) LIKE :query" +
        "   OR EXISTS (SELECT 1 FROM MediaFile mq JOIN mq.persons pq WHERE mq.id = m.id" +
        "     AND (LOWER(pq.name) LIKE :query OR LOWER(pq.displayName) LIKE :query))))";

    @Query("SELECT m FROM MediaFile m" + SEARCH_WHERE)
    Page<MediaFile> searchSorted(
        @Param("type") MediaFile.FileType type,
        @Param("orientation") MediaFile.Orientation orientation,
        @Param("category") MediaFile.MediaCategory category,
        @Param("source") String source,
        @Param("ext") String ext,
        @Param("favorite") Boolean favorite,
        @Param("featured") Boolean featured,
        @Param("hasGps") Boolean hasGps,
        @Param("hasPerson") boolean hasPerson,
        @Param("personId") UUID personId,
        @Param("hasTakenBy") boolean hasTakenBy,
        @Param("takenById") UUID takenById,
        @Param("hasCollection") boolean hasCollection,
        @Param("collectionId") UUID collectionId,
        @Param("hasInclude") boolean hasInclude,
        @Param("tagIds") List<UUID> tagIds,
        @Param("tagNames") List<String> tagNames,
        @Param("hasExclude") boolean hasExclude,
        @Param("excludeTagIds") List<UUID> excludeTagIds,
        @Param("excludeTagNames") List<String> excludeTagNames,
        @Param("hasQuery") boolean hasQuery,
        @Param("query") String query,
        Pageable pageable);

    @Query("SELECT m FROM MediaFile m" + SEARCH_WHERE + " ORDER BY FUNCTION('RANDOM')")
    List<MediaFile> searchRandom(
        @Param("type") MediaFile.FileType type,
        @Param("orientation") MediaFile.Orientation orientation,
        @Param("category") MediaFile.MediaCategory category,
        @Param("source") String source,
        @Param("ext") String ext,
        @Param("favorite") Boolean favorite,
        @Param("featured") Boolean featured,
        @Param("hasGps") Boolean hasGps,
        @Param("hasPerson") boolean hasPerson,
        @Param("personId") UUID personId,
        @Param("hasTakenBy") boolean hasTakenBy,
        @Param("takenById") UUID takenById,
        @Param("hasCollection") boolean hasCollection,
        @Param("collectionId") UUID collectionId,
        @Param("hasInclude") boolean hasInclude,
        @Param("tagIds") List<UUID> tagIds,
        @Param("tagNames") List<String> tagNames,
        @Param("hasExclude") boolean hasExclude,
        @Param("excludeTagIds") List<UUID> excludeTagIds,
        @Param("excludeTagNames") List<String> excludeTagNames,
        @Param("hasQuery") boolean hasQuery,
        @Param("query") String query,
        Pageable pageable);
}
