package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Collection;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CollectionRepository extends JpaRepository<Collection, UUID> {
    List<Collection> findByParentIsNull();
    List<Collection> findByParentId(UUID parentId);
    List<Collection> findByPersonsId(UUID personId);
}
