package com.sonic.angels.model.entity;

import com.sonic.angels.util.FinanceText;
import jakarta.persistence.MappedSuperclass;
import java.time.LocalDateTime;

/** Finance keeps every time in UTC (the UIs show them in Vietnam time), so its stamps must not follow the server's zone. */
@MappedSuperclass
public abstract class FinanceEntity extends BaseEntity {
    @Override
    protected LocalDateTime clock() { return FinanceText.nowUtc(); }
}
