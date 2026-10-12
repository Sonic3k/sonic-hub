package com.sonic.angels.repository;

import com.sonic.angels.model.entity.FinanceCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FinanceCategoryRepository extends JpaRepository<FinanceCategory, UUID> {

    List<FinanceCategory> findAllByOrderByKindAscSortOrderAscNameAsc();

    Optional<FinanceCategory> findByCode(String code);

    boolean existsByCode(String code);
}
