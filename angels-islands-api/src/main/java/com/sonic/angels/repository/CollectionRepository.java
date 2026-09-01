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
    List<Collection> findByPersonsId(UUID personId);
    Optional<Collection> findByNameAndParentIsNull(String name);
}
