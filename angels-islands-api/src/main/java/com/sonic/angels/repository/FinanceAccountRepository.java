package com.sonic.angels.repository;

import com.sonic.angels.model.entity.FinanceAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FinanceAccountRepository extends JpaRepository<FinanceAccount, UUID> {

    List<FinanceAccount> findAllByOrderBySortOrderAscCreatedAtAsc();

    Optional<FinanceAccount> findFirstByAccountNumber(String accountNumber);

    Optional<FinanceAccount> findFirstByModeAndArchivedFalseOrderBySortOrderAsc(FinanceAccount.Mode mode);
}
