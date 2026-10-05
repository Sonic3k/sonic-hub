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

    /** The album, plus every sub-album below it when deep = true. */
    String TREE = "WITH RECURSIVE tree AS (SELECT id FROM collections WHERE id = :rootId " +
        "UNION ALL SELECT c.id FROM collections c JOIN tree ON c.parent_id = tree.id WHERE CAST(:deep AS boolean)) ";

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = TREE + "INSERT INTO media_file_tags(media_file_id, tag_id) " +
        "SELECT DISTINCT cm.media_file_id, CAST(:tagId AS uuid) FROM collection_media cm WHERE cm.collection_id IN (SELECT id FROM tree) " +
        "AND NOT EXISTS (SELECT 1 FROM media_file_tags x WHERE x.media_file_id = cm.media_file_id AND x.tag_id = CAST(:tagId AS uuid))", nativeQuery = true)
    int tagAllMedia(UUID rootId, boolean deep, UUID tagId);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = TREE + "DELETE FROM media_file_tags WHERE tag_id = CAST(:tagId AS uuid) " +
        "AND media_file_id IN (SELECT cm.media_file_id FROM collection_media cm WHERE cm.collection_id IN (SELECT id FROM tree))", nativeQuery = true)
    int untagAllMedia(UUID rootId, boolean deep, UUID tagId);

    @Query(value = TREE + "SELECT COUNT(DISTINCT cm.media_file_id) FROM collection_media cm WHERE cm.collection_id IN (SELECT id FROM tree)", nativeQuery = true)
    long countMediaInTree(UUID rootId, boolean deep);

    @Query(value = TREE + "SELECT mt.tag_id, COUNT(DISTINCT mt.media_file_id) FROM media_file_tags mt " +
        "WHERE mt.media_file_id IN (SELECT cm.media_file_id FROM collection_media cm WHERE cm.collection_id IN (SELECT id FROM tree)) GROUP BY mt.tag_id", nativeQuery = true)
    List<Object[]> tagCountsInTree(UUID rootId, boolean deep);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "INSERT INTO collection_tags(collection_id, tag_id) SELECT :rootId, :tagId " +
        "WHERE NOT EXISTS (SELECT 1 FROM collection_tags WHERE collection_id = :rootId AND tag_id = :tagId)", nativeQuery = true)
    void addAlbumTag(UUID rootId, UUID tagId);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM collection_tags WHERE collection_id = :rootId AND tag_id = :tagId", nativeQuery = true)
    void removeAlbumTag(UUID rootId, UUID tagId);
    Optional<Collection> findByNameAndParentIsNull(String name);
}
