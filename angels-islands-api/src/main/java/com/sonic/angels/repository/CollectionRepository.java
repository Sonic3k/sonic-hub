package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Collection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CollectionRepository extends JpaRepository<Collection, UUID> {
    List<Collection> findByParentIsNull();
    List<Collection> findByParentId(UUID parentId);
    List<Collection> findByParentIdAndSlug(UUID parentId, String slug);

    long countByParentId(UUID parentId);

    @Query(value = "SELECT COUNT(*) FROM collection_media WHERE collection_id = :collectionId", nativeQuery = true)
    long countMediaInCollection(UUID collectionId);

    /** Media being deleted may be some collections' cover — clear refs first or the FK blows up. */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "UPDATE collections SET thumbnail_media_file_id = NULL WHERE thumbnail_media_file_id = :mediaId", nativeQuery = true)
    void clearThumbnailRefs(UUID mediaId);

    /** Insert-if-absent link. Avoids loading the whole lazy media set per upload and
     *  avoids duplicate join rows under the 4-worker concurrent upload queue. */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "INSERT INTO collection_media(collection_id, media_file_id) " +
        "SELECT :collectionId, :mediaId WHERE NOT EXISTS " +
        "(SELECT 1 FROM collection_media WHERE collection_id = :collectionId AND media_file_id = :mediaId)", nativeQuery = true)
    void linkMedia(UUID collectionId, UUID mediaId);
    List<Collection> findByPersonsId(UUID personId);
    Optional<Collection> findByNameAndParentIsNull(String name);
}
