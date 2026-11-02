package com.sonic.angels.service;

import com.sonic.angels.util.FinanceText;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.NavigableMap;

/**
 * Money from one currency into another with the rate of the day it moved — a 2019 dollar at the 2019 rate, not
 * today's. VND is the hub (X → VND → Y). A day without its own rate takes the latest one before it; a day before
 * every known rate takes the earliest. "Today" is the latest known rate, except USD, where a rate typed in admin wins.
 * An unknown currency gives null: the caller leaves the amount out rather than guess.
 * A snapshot: built from the rates table, replaced whenever rates are added.
 */
public final class FinanceFx {

    public static final String VND = "VND";

    /** per currency (upper case): day → VND for one unit */
    private final Map<String, NavigableMap<LocalDate, BigDecimal>> rates;
    /** typed in admin; null when the automatic rates rule */
    private final BigDecimal usdManual;
    /** the daily USD rate kept in settings, for when the table has no USD yet */
    private final BigDecimal usdFallback;

    public FinanceFx(Map<String, NavigableMap<LocalDate, BigDecimal>> rates, BigDecimal usdManual, BigDecimal usdFallback) {
        this.rates = rates; this.usdManual = usdManual; this.usdFallback = usdFallback;
    }

    static boolean isVnd(String currency) { return currency == null || currency.isBlank() || VND.equalsIgnoreCase(currency); }

    /** VND for one unit of the currency on that (Vietnam) day; null when unknown. */
    public BigDecimal rate(String currency, LocalDate day) {
        if (isVnd(currency)) return BigDecimal.ONE;
        NavigableMap<LocalDate, BigDecimal> m = rates.get(currency.toUpperCase());
        if (m == null || m.isEmpty()) return "USD".equalsIgnoreCase(currency) ? (usdManual != null ? usdManual : usdFallback) : null;
        Map.Entry<LocalDate, BigDecimal> e = m.floorEntry(day);
        return (e != null ? e : m.firstEntry()).getValue();
    }

    /** VND for one unit now. */
    public BigDecimal today(String currency) {
        if (isVnd(currency)) return BigDecimal.ONE;
        if ("USD".equalsIgnoreCase(currency) && usdManual != null) return usdManual;
        return rate(currency, LocalDate.now(FinanceText.VN));
    }

    /** amount (in currency) → VND with the rate of the day it moved (a UTC time); null when the rate is unknown. */
    public BigDecimal vnd(BigDecimal amount, String currency, LocalDateTime utc) {
        if (amount == null) return null;
        if (isVnd(currency)) return amount;
        BigDecimal r = rate(currency, FinanceText.utcToVn(utc).toLocalDate());
        return r == null ? null : amount.multiply(r).setScale(0, RoundingMode.HALF_UP);
    }

    /** amount (in currency) → VND at today's rate (a balance as it stands now). */
    public BigDecimal vndToday(BigDecimal amount, String currency) {
        if (amount == null) return null;
        if (isVnd(currency)) return amount;
        BigDecimal r = today(currency);
        return r == null ? null : amount.multiply(r).setScale(0, RoundingMode.HALF_UP);
    }

    /** amount in `from` → `to`, with the rates of that day; null when either rate is unknown. */
    public BigDecimal convert(BigDecimal amount, String from, String to, LocalDateTime utc) {
        if (amount == null) return null;
        if ((isVnd(from) && isVnd(to)) || (from != null && from.equalsIgnoreCase(to))) return amount;
        BigDecimal v = vnd(amount, from, utc);
        if (v == null || isVnd(to)) return v;
        BigDecimal r = rate(to, FinanceText.utcToVn(utc).toLocalDate());
        return r == null ? null : v.divide(r, 2, RoundingMode.HALF_UP);
    }

    /** amount in `from` → `to` at today's rates. */
    public BigDecimal convertToday(BigDecimal amount, String from, String to) {
        if (amount == null) return null;
        if ((isVnd(from) && isVnd(to)) || (from != null && from.equalsIgnoreCase(to))) return amount;
        BigDecimal v = vndToday(amount, from);
        if (v == null || isVnd(to)) return v;
        BigDecimal r = today(to);
        return r == null ? null : v.divide(r, 2, RoundingMode.HALF_UP);
    }
}
