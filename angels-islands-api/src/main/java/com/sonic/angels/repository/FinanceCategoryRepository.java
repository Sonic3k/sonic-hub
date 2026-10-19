package com.sonic.angels.repository;

import com.sonic.angels.model.entity.FinanceCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FinanceCategoryRepository extends JpaRepository<FinanceCategory, UUID> {

    List<FinanceCategory> findAllByOrderByKindAscSortOrderAscNameAsc();

    Optional<FinanceCategory> findByCode(String code);

    boolean existsByCode(String code);

    long countByFacetId(UUID facetId);

    /** Tags that bring this one along. */
    @Query("SELECT c FROM FinanceCategory c JOIN c.implies i WHERE i.id = :id")
    List<FinanceCategory> implying(UUID id);
}
