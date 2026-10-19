package com.sonic.angels.repository;

import com.sonic.angels.model.entity.FinanceFacet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FinanceFacetRepository extends JpaRepository<FinanceFacet, UUID> {

    List<FinanceFacet> findAllByOrderBySortOrderAscNameAsc();

    Optional<FinanceFacet> findByCode(String code);

    boolean existsByCode(String code);

    Optional<FinanceFacet> findFirstByMainTrue();
}
