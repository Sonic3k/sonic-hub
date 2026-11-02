package com.sonic.angels.repository;

import com.sonic.angels.model.entity.FinanceRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface FinanceRateRepository extends JpaRepository<FinanceRate, UUID> {

    List<FinanceRate> findAllByOrderByCurrencyAscDayAsc();

    List<FinanceRate> findByCurrencyAndDayIn(String currency, Collection<LocalDate> days);

    List<FinanceRate> findByCurrencyAndDayBetweenOrderByDayAsc(String currency, LocalDate from, LocalDate to);

    @Query("select distinct r.currency from FinanceRate r")
    List<String> currencies();
}
