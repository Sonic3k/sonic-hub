package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Collection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CollectionRepository extends JpaRepository<Collection, Long> {
    List<Collection> findByParentIsNull();
    List<Collection> findByParentId(Long parentId);
    List<Collection> findByPersonsId(Long personId);
}
