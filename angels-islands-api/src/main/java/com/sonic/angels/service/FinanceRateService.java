package com.sonic.angels.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonic.angels.model.entity.AppSetting;
import com.sonic.angels.repository.AppSettingRepository;
import com.sonic.angels.util.FinanceText;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.time.Duration;
import java.time.LocalDateTime;

/**
 * USD → VND for the Bank of America account. Taken once a day from open.er-api.com (free, no key) and kept in
 * app_settings, so a restart or a failed fetch still has the last rate. A rate typed in admin wins until removed.
 * Reads come from memory; the database is touched (in a transaction of its own) only to load or store a rate.
 */
@Service
public class FinanceRateService {

    private static final Logger log = LoggerFactory.getLogger(FinanceRateService.class);
    static final String RATE = "finance.rate.USD", AT = "finance.rate.USD.at", MANUAL = "finance.rate.USD.manual";

    public record Rate(BigDecimal value, LocalDateTime at, boolean manual) {}

    private final AppSettingRepository settings;
    private final TransactionTemplate tx;
    private final ObjectMapper om = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
    private volatile Rate cached;
    private volatile boolean loaded;
    private volatile LocalDateTime lastAttempt;

    public FinanceRateService(AppSettingRepository settings, PlatformTransactionManager txManager) {
        this.settings = settings;
        this.tx = new TransactionTemplate(txManager);
        this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public synchronized Rate usd() {
        if (!loaded) { cached = tx.execute(s -> load()); loaded = true; }
        Rate r = cached;
        if (r != null && r.manual()) return r;
        boolean stale = r == null || r.at() == null || r.at().isBefore(FinanceText.nowUtc().minusHours(24));
        boolean triedRecently = lastAttempt != null && lastAttempt.isAfter(FinanceText.nowUtc().minusMinutes(30));
        if (stale && !triedRecently) {
            lastAttempt = FinanceText.nowUtc();
            BigDecimal fresh = fetch();
            if (fresh != null) {
                Rate nr = new Rate(fresh, FinanceText.nowUtc(), false);
                tx.executeWithoutResult(s -> { put(RATE, fresh.toPlainString()); put(AT, nr.at().toString()); put(MANUAL, "false"); });
                cached = r = nr;
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
        loaded = false; lastAttempt = null; cached = null;
    }

    /** amount in currency → VND (null when the rate is unknown). */
    public static BigDecimal toVnd(BigDecimal amount, String currency, BigDecimal usdRate) {
        if (amount == null) return null;
        if (currency == null || currency.equalsIgnoreCase("VND")) return amount;
        if (currency.equalsIgnoreCase("USD") && usdRate != null) return amount.multiply(usdRate).setScale(0, RoundingMode.HALF_UP);
        return null;
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

    private BigDecimal fetch() {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create("https://open.er-api.com/v6/latest/USD"))
                .timeout(Duration.ofSeconds(5)).GET().build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) { log.warn("USD rate: HTTP {}", resp.statusCode()); return null; }
            JsonNode vnd = om.readTree(resp.body()).path("rates").path("VND");
            if (!vnd.isNumber()) return null;
            return vnd.decimalValue().setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            log.warn("USD rate not fetched: {}", e.getMessage());
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
