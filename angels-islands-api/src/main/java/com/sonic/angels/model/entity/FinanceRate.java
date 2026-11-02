package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * What one unit of a currency was worth in VND on a day (Vietnam date). A day without its own row takes the latest
 * day before it; a monthly figure is stored on the 1st of its month and stands for the days that follow, until a
 * later row. Filled once from history and then every day; a line is turned into VND with the rate of its own day.
 */
@Entity
@Table(name = "finance_rates",
    uniqueConstraints = @UniqueConstraint(name = "uk_finance_rate_currency_day", columnNames = {"currency", "day"}),
    indexes = @Index(name = "idx_finance_rate_currency_day", columnList = "currency, day"))
public class FinanceRate extends FinanceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "day", nullable = false)
    private LocalDate day;

    /** VND for one unit of the currency. */
    @Column(name = "vnd", nullable = false, precision = 20, scale = 6)
    private BigDecimal vnd;

    /** Where it came from: "bis-monthly", "ecb", "fawaz", "er-api", "manual". */
    @Column(name = "source", length = 20)
    private String source;

    public FinanceRate() {}

    public FinanceRate(String currency, LocalDate day, BigDecimal vnd, String source) {
        this.currency = currency; this.day = day; this.vnd = vnd; this.source = source;
    }

    public UUID getId() { return id; }
    public String getCurrency() { return currency; }
    public LocalDate getDay() { return day; }
    public BigDecimal getVnd() { return vnd; }
    public void setVnd(BigDecimal vnd) { this.vnd = vnd; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}
