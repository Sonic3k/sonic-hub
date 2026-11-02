package com.sonic.angels.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonic.angels.model.dto.FinanceDto;
import com.sonic.angels.model.entity.AppSetting;
import com.sonic.angels.model.entity.FinanceAccount;
import com.sonic.angels.model.entity.FinanceRate;
import com.sonic.angels.repository.AppSettingRepository;
import com.sonic.angels.repository.FinanceAccountRepository;
import com.sonic.angels.repository.FinanceRateRepository;
import com.sonic.angels.repository.FinanceTransactionRepository;
import com.sonic.angels.util.FinanceText;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Exchange rates. The rates table holds what one unit of each currency was worth in VND, day by day (filled once
 * from history, then every day); FinanceFx turns any amount into VND — or another currency — with the rate of the
 * day it moved. The daily rate comes from open.er-api.com (free, no key) for every currency in use (an account's,
 * or one a line was paid in); its USD figure is also kept in app_settings, so a restart or a failed fetch still has
 * one. A USD rate typed in admin wins for "now" (balances) until removed; the day-by-day history is never overridden.
 */
@Service
public class FinanceRateService {

    private static final Logger log = LoggerFactory.getLogger(FinanceRateService.class);
    static final String RATE = "finance.rate.USD", AT = "finance.rate.USD.at", MANUAL = "finance.rate.USD.manual";
    private static final Pattern CODE = Pattern.compile("[A-Z]{3}");

    public record Rate(BigDecimal value, LocalDateTime at, boolean manual) {}

    private final AppSettingRepository settings;
    private final FinanceRateRepository rateRepo;
    private final FinanceAccountRepository accountRepo;
    private final FinanceTransactionRepository txnRepo;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final ObjectMapper om = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
    private volatile Rate cached;
    private volatile boolean loaded;
    private volatile LocalDateTime lastAttempt;
    private volatile FinanceFx fx;
    private volatile LocalDate historyDay;

    public FinanceRateService(AppSettingRepository settings, FinanceRateRepository rateRepo, FinanceAccountRepository accountRepo,
                              FinanceTransactionRepository txnRepo, JdbcTemplate jdbc, PlatformTransactionManager txManager) {
        this.settings = settings; this.rateRepo = rateRepo; this.accountRepo = accountRepo; this.txnRepo = txnRepo; this.jdbc = jdbc;
        this.tx = new TransactionTemplate(txManager);
        this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** Today's USD rate (typed in admin, or the daily one); fetches the day's rates when they are a day old. */
    public synchronized Rate usd() {
        if (!loaded) { cached = tx.execute(s -> load()); loaded = true; }
        Rate r = cached;
        LocalDateTime now = FinanceText.nowUtc();
        boolean usdStale = r == null || (!r.manual() && (r.at() == null || r.at().isBefore(now.minusHours(24))));
        boolean historyStale = !LocalDate.now(FinanceText.VN).equals(historyDay);      // today's row of every currency
        boolean triedRecently = lastAttempt != null && lastAttempt.isAfter(now.minusMinutes(30));
        if ((usdStale || historyStale) && !triedRecently) {
            lastAttempt = now;
            JsonNode all = fetch();
            if (all != null) {
                BigDecimal fresh = all.path("VND").isNumber() ? all.path("VND").decimalValue().setScale(2, RoundingMode.HALF_UP) : null;
                if (fresh != null && (r == null || !r.manual())) {                    // a rate he typed stays
                    Rate nr = new Rate(fresh, now, false);
                    tx.executeWithoutResult(s -> { put(RATE, fresh.toPlainString()); put(AT, nr.at().toString()); put(MANUAL, "false"); });
                    cached = r = nr;
                }
                storeToday(all);
                historyDay = LocalDate.now(FinanceText.VN);
            }
        }
        return r;
    }

    public BigDecimal usdValue() { Rate r = usd(); return r == null ? null : r.value(); }

    /** Typed in admin; null goes back to the automatic daily rate. */
    public synchronized void setManual(BigDecimal value) {
        if (value != null && value.signum() <= 0) throw new IllegalArgumentException("The exchange rate must be above 0");
        LocalDateTime now = FinanceText.nowUtc();
        tx.executeWithoutResult(s -> {
            if (value == null) { put(MANUAL, "false"); put(AT, ""); }
            else { put(RATE, value.toPlainString()); put(AT, now.toString()); put(MANUAL, "true"); }
        });
        loaded = false; lastAttempt = null; cached = null; fx = null;
    }

    /** The converter: every rate known, as of now. */
    public FinanceFx fx() {
        Rate u = usd();
        FinanceFx f = fx;
        if (f != null) return f;
        synchronized (this) {
            if (fx != null) return fx;
            Map<String, NavigableMap<LocalDate, BigDecimal>> m = new HashMap<>();
            List<FinanceRate> rows = tx.execute(s -> rateRepo.findAllByOrderByCurrencyAscDayAsc());
            for (FinanceRate r : rows == null ? List.<FinanceRate>of() : rows)
                m.computeIfAbsent(r.getCurrency(), k -> new TreeMap<>()).put(r.getDay(), r.getVnd());
            fx = new FinanceFx(m, u != null && u.manual() ? u.value() : null, u == null ? null : u.value());
            return fx;
        }
    }

    /** Add or replace rates (currency + day); the converter starts over. */
    public int upsert(List<FinanceDto.RateRow> rows) {
        if (rows == null || rows.isEmpty()) return 0;
        List<Object[]> args = new ArrayList<>();
        Timestamp now = Timestamp.valueOf(FinanceText.nowUtc());
        for (FinanceDto.RateRow r : rows) {
            String c = r.currency() == null ? "" : r.currency().trim().toUpperCase(Locale.ROOT);
            if (!CODE.matcher(c).matches() || "VND".equals(c)) throw new IllegalArgumentException("Not a currency code: " + r.currency());
            if (r.day() == null) throw new IllegalArgumentException("A rate needs its day");
            if (r.vnd() == null || r.vnd().signum() <= 0) throw new IllegalArgumentException("A rate must be above 0 (" + c + " " + r.day() + ")");
            args.add(new Object[]{c, Date.valueOf(r.day()), r.vnd(), r.source() == null ? null : r.source().length() > 20 ? r.source().substring(0, 20) : r.source(), now, now});
        }
        jdbc.batchUpdate("INSERT INTO finance_rates (id, currency, day, vnd, source, created_at, updated_at) VALUES (gen_random_uuid(), ?, ?, ?, ?, ?, ?) "
            + "ON CONFLICT (currency, day) DO UPDATE SET vnd = EXCLUDED.vnd, source = EXCLUDED.source, updated_at = EXCLUDED.updated_at", args);
        fx = null;
        return args.size();
    }

    public List<FinanceDto.RateRow> list(String currency, LocalDate from, LocalDate to) {
        String c = currency == null ? "USD" : currency.trim().toUpperCase(Locale.ROOT);
        return rateRepo.findByCurrencyAndDayBetweenOrderByDayAsc(c, from == null ? LocalDate.of(2000, 1, 1) : from, to == null ? LocalDate.of(2100, 1, 1) : to)
            .stream().map(r -> new FinanceDto.RateRow(r.getCurrency(), r.getDay(), r.getVnd(), r.getSource())).toList();
    }

    /** Every currency money here is kept or paid in, or that already has a history here, besides VND. */
    public Set<String> currenciesInUse() {
        Set<String> out = new TreeSet<>(List.of("USD"));
        Set<String> found = tx.execute(s -> {
            Set<String> x = new HashSet<>(rateRepo.currencies());
            for (FinanceAccount a : accountRepo.findAll()) if (a.getCurrency() != null) x.add(a.getCurrency().toUpperCase(Locale.ROOT));
            for (String c : txnRepo.originalCurrencies()) if (c != null) x.add(c.toUpperCase(Locale.ROOT));
            return x;
        });
        if (found != null) out.addAll(found);
        out.remove("VND");
        return out;
    }

    /** Today's rates (VND for one unit) of every currency in use, from one "USD →" quote. */
    private void storeToday(JsonNode all) {
        try {
            BigDecimal vndPerUsd = all.path("VND").decimalValue();
            List<FinanceDto.RateRow> rows = new ArrayList<>();
            LocalDate today = LocalDate.now(FinanceText.VN);
            for (String c : currenciesInUse()) {
                JsonNode x = all.path(c);
                if (!x.isNumber() || x.decimalValue().signum() <= 0) continue;
                rows.add(new FinanceDto.RateRow(c, today, vndPerUsd.divide(x.decimalValue(), 6, RoundingMode.HALF_UP), "er-api"));
            }
            tx.executeWithoutResult(s -> upsert(rows));
        } catch (Exception e) {
            log.warn("Today's rates not stored: {}", e.getMessage());
        }
    }

    private Rate load() {
        String v = get(RATE);
        if (v == null || v.isBlank()) return null;
        String at = get(AT);
        LocalDateTime when = null;
        try { if (at != null && !at.isBlank()) when = LocalDateTime.parse(at); } catch (Exception ignored) { }
        try { return new Rate(new BigDecimal(v), when, "true".equals(get(MANUAL))); }
        catch (NumberFormatException e) { return null; }
    }

    /** "USD → every currency" today, or null. */
    private JsonNode fetch() {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create("https://open.er-api.com/v6/latest/USD"))
                .timeout(Duration.ofSeconds(5)).GET().build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) { log.warn("Rates: HTTP {}", resp.statusCode()); return null; }
            JsonNode rates = om.readTree(resp.body()).path("rates");
            return rates.isObject() ? rates : null;
        } catch (Exception e) {
            log.warn("Rates not fetched: {}", e.getMessage());
            return null;
        }
    }

    private String get(String key) { return settings.findById(key).map(AppSetting::getValue).orElse(null); }

    private void put(String key, String value) {
        AppSetting s = settings.findById(key).orElseGet(() -> new AppSetting(key, value));
        s.setValue(value);
        settings.save(s);
    }
}
