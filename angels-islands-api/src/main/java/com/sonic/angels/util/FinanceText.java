package com.sonic.angels.util;

import java.text.Normalizer;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Pattern;

/** Text and time helpers for the finance module: accent-free matching, keyword suggestions, Vietnam-time months. */
public final class FinanceText {

    public static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final Pattern MARKS = Pattern.compile("\\p{M}+");
    private static final Pattern NON_WORD = Pattern.compile("[^A-Z0-9]+");

    /** Words a bank line is full of that say nothing about what the money was for. */
    private static final Set<String> NOISE = Set.of(
        "CK", "CHUYEN", "TIEN", "KHOAN", "CHUYENKHOAN", "CHUYENTIEN", "TT", "THANH", "TOAN", "THANHTOAN", "QR", "VIETQR",
        "NAPAS", "IBFT", "FT", "MBVCB", "TPB", "TPBANK", "TCB", "TECHCOMBANK", "TK", "TU", "DEN", "TAI", "NGAN", "HANG",
        "GD", "MA", "SO", "PAY", "PAYMENT", "TRANSFER", "ND", "NOI", "DUNG", "VND", "VIA", "TRACE", "REF", "BIDV", "VCB",
        "CHO", "CUA", "VA", "LUC", "NGAY", "TRANSACTION", "ACCOUNT", "ACC", "STK", "QUA", "APP", "MOBILE", "BANKING",
        "INTERNET", "IB", "MB", "SMS", "DV", "TRA", "GIAO", "DICH", "GIAODICH", "SEVQR", "DEBIT", "CREDIT", "CARD", "THE",
        "POS", "ECOM", "NAP", "VAO", "RA", "ID", "TID", "MID", "SHB", "ACB", "VIB", "MSB", "OCB", "SCB", "HDB", "VPB");

    private FinanceText() {}

    /** "Ăn trưa, Phở 35k!" → "AN TRUA PHO 35K": no accents, upper case, words split on anything else. */
    public static String normalize(String s) {
        if (s == null || s.isBlank()) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFD);
        n = MARKS.matcher(n).replaceAll("").replace('đ', 'd').replace('Đ', 'D').toUpperCase(Locale.ROOT);
        return NON_WORD.matcher(n).replaceAll(" ").trim();
    }

    /** The keywords of a rule ("grab|xanh sm|be group"), each normalized; blanks dropped. */
    public static List<String> keywords(String spec) {
        if (spec == null) return List.of();
        List<String> out = new ArrayList<>();
        for (String k : spec.split("\\|")) {
            String n = normalize(k);
            if (!n.isEmpty()) out.add(n);
        }
        return out;
    }

    /** True when one keyword appears in the text as whole words (normalized text, padded with spaces). */
    public static boolean matchesAny(String paddedText, List<String> keywords) {
        for (String k : keywords) if (paddedText.contains(" " + k + " ")) return true;
        return false;
    }

    public static String padded(String text) { return " " + normalize(text) + " "; }

    /**
     * A first guess at the words that identify a counterpart: the first meaningful words of the memo,
     * bank noise and numbers dropped. "HIGHLANDS COFFEE 123 TRAN DUY HUNG" → "highlands coffee tran".
     */
    public static String suggestKeywords(String text) {
        String n = normalize(text);
        if (n.isEmpty()) return "";
        List<String> kept = new ArrayList<>();
        for (String w : n.split(" ")) {
            if (NOISE.contains(w) || w.chars().anyMatch(Character::isDigit)) continue;   // one letter stays: "NGUYEN VAN A"
            kept.add(w.toLowerCase(Locale.ROOT));
            if (kept.size() == 3) break;
        }
        return String.join(" ", kept);
    }

    // ── time ──

    /** Vietnam wall-clock time → the UTC LocalDateTime this database stores. */
    public static LocalDateTime vnToUtc(LocalDateTime vn) {
        return vn.atZone(VN).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
    }

    public static LocalDateTime utcToVn(LocalDateTime utc) {
        return utc.atOffset(ZoneOffset.UTC).atZoneSameInstant(VN).toLocalDateTime();
    }

    public static LocalDateTime nowUtc() { return LocalDateTime.now(ZoneOffset.UTC); }

    /** First instant of a Vietnam month, in UTC. */
    public static LocalDateTime monthStartUtc(YearMonth m) { return vnToUtc(m.atDay(1).atStartOfDay()); }

    public static YearMonth currentMonth() { return YearMonth.now(VN); }

    /** "2026-10" → that month; blank → the current one. */
    public static YearMonth parseMonth(String s) {
        if (s == null || s.isBlank()) return currentMonth();
        try { return YearMonth.parse(s.trim()); }
        catch (DateTimeParseException e) { throw new IllegalArgumentException("month must look like 2026-10"); }
    }

    /**
     * A time from a client: with Z or an offset it is converted; a bare "2026-10-12T05:00:00" is already UTC
     * (the house convention); a bare date is noon in Vietnam. Blank → now.
     */
    public static LocalDateTime parseClientTime(String s) {
        if (s == null || s.isBlank()) return nowUtc();
        String v = s.trim();
        try { return OffsetDateTime.parse(v).withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime(); }
        catch (DateTimeParseException ignored) { }
        try { return LocalDateTime.parse(v); }
        catch (DateTimeParseException ignored) { }
        try { return vnToUtc(LocalDate.parse(v).atTime(12, 0)); }
        catch (DateTimeParseException e) { throw new IllegalArgumentException("Bad time: " + s); }
    }

    private static final DateTimeFormatter SEPAY = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /** SePay's "2024-07-02 11:08:33" (Vietnam time) → UTC; unreadable → now. */
    public static LocalDateTime parseSepayTime(String s) {
        if (s == null || s.isBlank()) return nowUtc();
        try { return vnToUtc(LocalDateTime.parse(s.trim(), SEPAY)); }
        catch (DateTimeParseException e) {
            try { return parseClientTime(s); } catch (IllegalArgumentException ignored) { return nowUtc(); }
        }
    }
}
