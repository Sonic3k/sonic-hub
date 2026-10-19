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
     * A first guess at the words that identify a counterpart: the first run of meaningful words in the memo (up to
     * three, stopping at bank noise or a number), so the phrase appears as it is in the next similar line.
     * "HIGHLANDS COFFEE 123 TRAN DUY HUNG" → "highlands coffee"; "đồ chơi cho bé" → "do choi";
     * "NGUYEN VAN A chuyen tien" → "nguyen van a".
     */
    public static String suggestKeywords(String text) {
        String n = normalize(text);
        if (n.isEmpty()) return "";
        List<String> kept = new ArrayList<>();
        for (String w : n.split(" ")) {
            boolean meaningful = !NOISE.contains(w) && w.chars().noneMatch(Character::isDigit);
            if (!meaningful) { if (kept.isEmpty()) continue; else break; }
            kept.add(w.toLowerCase(Locale.ROOT));
            if (kept.size() == 3) break;
        }
        return String.join(" ", kept);
    }

    // ── counterparties ──

    private static final Pattern CP_AMOUNT_PREFIX = Pattern.compile("(?i)^HD\\d+VND_");
    private static final Pattern CP_AMOUNT_SUFFIX = Pattern.compile("(?i)_\\d+VND(_\\w+)?$");
    private static final Pattern CARD = Pattern.compile("(?i)^\\s*GIAO DICH THE\\s+\\d+\\s+TAI\\s+(.+)$");
    private static final Pattern DIGIT_RUN = Pattern.compile("\\d{3,}");

    /**
     * A counterparty name as people read it, without the order amounts some shops put in it:
     * "HD65000VND_CJ BAKERY VIETNAM" → "CJ BAKERY VIETNAM"; "Y DUOC 3P - LANG SINH VIEN_99000VND_12" → "Y DUOC 3P - LANG SINH VIEN".
     */
    public static String cleanCounterparty(String name) {
        if (name == null) return null;
        String n = CP_AMOUNT_SUFFIX.matcher(CP_AMOUNT_PREFIX.matcher(name.trim()).replaceFirst("")).replaceFirst("");
        n = n.replaceAll("\\s+", " ").trim();
        if (n.isEmpty()) return null;
        return n.length() > 200 ? n.substring(0, 200) : n;
    }

    /** What two lines must share to be "the same counterparty": the cleaned name, normalized. */
    public static String counterpartyKey(String name) {
        String c = cleanCounterparty(name);
        return c == null ? "" : normalize(c);
    }

    /**
     * The merchant of a card payment, from the bank line: "GIAO DICH THE 0465 TAI Green SM8424393666VN" → "Green SM",
     * "…TAI ANTHROPIC+14152360599US" → "ANTHROPIC", "…TAI Google YouTubePremium650-…" → "Google YouTube Premium".
     * Null for other lines.
     */
    public static String cardMerchant(String memo) {
        if (memo == null) return null;
        java.util.regex.Matcher m = CARD.matcher(memo);
        if (!m.matches()) return null;
        String s = m.group(1);
        int plus = s.indexOf('+');
        if (plus >= 0) s = s.substring(0, plus);
        java.util.regex.Matcher d = DIGIT_RUN.matcher(s);
        if (d.find()) s = s.substring(0, d.start());
        s = s.replaceAll("(?<=[a-z]{3})(?=[A-Z][a-z]{2,})", " ").replaceAll("(?<=[A-Z]{2})(?=[A-Z][a-z]{2,})", " ");
        s = s.replaceAll("[\\s\\-_.*/]+$", "").replaceAll("^[\\s\\-_.*/]+", "").replaceAll("\\s+", " ").trim();
        return s.isEmpty() ? null : (s.length() > 200 ? s.substring(0, 200) : s);
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
