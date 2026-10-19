package com.sonic.angels.util;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * A bank statement exported as a spreadsheet → its account number and one row per transaction.
 * Columns are found by their headers, so their order does not matter. Known layouts: TPBank "Lịch sử giao dịch
 * tài khoản" (eBank / app export): Ngày thực hiện, Ngày hiệu lực, Mô tả giao dịch, Ghi nợ, Ghi có, Số dư,
 * Tài khoản đối ứng, Tên tài khoản, Mã giao dịch.
 */
public final class BankStatementParser {

    /** One line of the statement. Times are Vietnam wall-clock; a date-only line is set at noon. */
    public record Row(int line, LocalDateTime occurredAtVn, boolean dateOnly, String description, BigDecimal amount,
                      BigDecimal balance, String counterpartyAccount, String counterpartyName, String reference) {}

    public record Statement(String bank, String accountNumber, String period, List<Row> rows, int skipped) {}

    private static final List<DateTimeFormatter> DATE_TIMES = List.of(
        DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss"), DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
        DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm"), DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
    private static final List<DateTimeFormatter> DATES = List.of(
        DateTimeFormatter.ofPattern("dd/MM/yyyy"), DateTimeFormatter.ofPattern("dd-MM-yyyy"));

    private BankStatementParser() {}

    public static Statement parse(List<List<String>> cells) {
        int header = -1;
        Map<String, Integer> col = new HashMap<>();
        for (int i = 0; i < cells.size() && header < 0; i++) {
            Map<String, Integer> found = new HashMap<>();
            List<String> row = cells.get(i);
            for (int c = 0; c < row.size(); c++) {
                String key = switch (FinanceText.normalize(row.get(c))) {
                    case "NGAY THUC HIEN", "NGAY GIAO DICH" -> "when";
                    case "NGAY HIEU LUC" -> "effective";
                    case "MO TA GIAO DICH", "MO TA", "NOI DUNG", "DIEN GIAI" -> "description";
                    case "GHI NO", "SO TIEN GHI NO", "PHAT SINH NO" -> "debit";
                    case "GHI CO", "SO TIEN GHI CO", "PHAT SINH CO" -> "credit";
                    case "SO DU" -> "balance";
                    case "TAI KHOAN DOI UNG", "SO TAI KHOAN DOI UNG" -> "counterpartyAccount";
                    case "TEN TAI KHOAN", "TEN TAI KHOAN DOI UNG", "TEN DOI UNG" -> "counterpartyName";
                    case "MA GIAO DICH", "SO THAM CHIEU", "MA THAM CHIEU" -> "reference";
                    default -> null;
                };
                if (key != null) found.putIfAbsent(key, c);
            }
            if (found.containsKey("when") && found.containsKey("debit") && found.containsKey("credit") && found.containsKey("reference")) {
                header = i;
                col = found;
            }
        }
        if (header < 0) throw new IllegalArgumentException(
            "Không nhận ra định dạng sao kê này (cần các cột Ngày thực hiện, Ghi nợ, Ghi có, Mã giao dịch)");

        String accountNumber = null, period = null;
        for (int i = 0; i < header; i++) {
            List<String> row = cells.get(i);
            for (int c = 0; c < row.size(); c++) {
                String label = FinanceText.normalize(row.get(c));
                if (label.startsWith("TAI KHOAN GIAO DICH") || label.equals("SO TAI KHOAN") || label.equals("TAI KHOAN")) {
                    String v = next(row, c);
                    if (v != null && v.replaceAll("\\D", "").length() >= 6) accountNumber = v.replaceAll("\\D", "");
                } else if (label.startsWith("THOI GIAN") || label.startsWith("TU NGAY")) {
                    String v = next(row, c);
                    if (v != null) period = v.trim();
                }
            }
        }

        List<Row> rows = new ArrayList<>();
        int skipped = 0;
        for (int i = header + 1; i < cells.size(); i++) {
            List<String> r = cells.get(i);
            String when = get(r, col.get("when"));
            String reference = get(r, col.get("reference"));
            BigDecimal debit = money(get(r, col.get("debit")));
            BigDecimal credit = money(get(r, col.get("credit")));
            if (when.isBlank() && reference.isBlank() && debit == null && credit == null) continue;
            boolean out = debit != null && debit.signum() != 0;
            boolean in = credit != null && credit.signum() != 0;
            LocalDateTime at = time(when);
            boolean dateOnly = false;
            if (at == null) {
                LocalDate d = date(when);
                if (d == null) d = date(get(r, col.get("effective")));
                if (d != null) { at = d.atTime(12, 0); dateOnly = true; }
            }
            if (at == null || out == in || reference.isBlank()) { skipped++; continue; }
            BigDecimal amount = out ? debit.abs().negate() : credit.abs();
            rows.add(new Row(i + 1, at, dateOnly, blankToNull(get(r, col.get("description"))), amount,
                money(get(r, col.get("balance"))), blankToNull(get(r, col.get("counterpartyAccount"))),
                blankToNull(get(r, col.get("counterpartyName"))), reference.trim()));
        }
        return new Statement("TPBANK", accountNumber, period, rows, skipped);
    }

    private static String next(List<String> row, int c) {
        for (int k = c + 1; k < row.size(); k++) if (!row.get(k).isBlank()) return row.get(k);
        return null;
    }

    private static String get(List<String> row, Integer c) {
        return c == null || c >= row.size() || row.get(c) == null ? "" : row.get(c).trim();
    }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }

    /** "1,247,270" / "1247270" / "1.247.270 đ" → 1247270; blank → null. */
    static BigDecimal money(String s) {
        if (s == null) return null;
        String t = s.replace(" ", "").replaceAll("[^0-9,.\\-]", "");
        if (t.isEmpty() || t.equals("-")) return null;
        if (t.contains(",") && t.contains(".")) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(".", "").replace(',', '.') : t.replace(",", "");
        else if (t.contains(",")) t = t.matches(".*,\\d{3}(,\\d{3})*$") ? t.replace(",", "") : t.replace(',', '.');
        else if (t.matches(".*\\.\\d{3}(\\.\\d{3})+$") || t.matches("\\d{1,3}\\.\\d{3}")) t = t.replace(".", "");
        try { return new BigDecimal(t); } catch (NumberFormatException e) { return null; }
    }

    private static LocalDateTime time(String s) {
        if (s == null || s.isBlank()) return null;
        for (DateTimeFormatter f : DATE_TIMES) {
            try { return LocalDateTime.parse(s.trim(), f); } catch (DateTimeParseException ignored) { }
        }
        return null;
    }

    private static LocalDate date(String s) {
        if (s == null || s.isBlank()) return null;
        for (DateTimeFormatter f : DATES) {
            try { return LocalDate.parse(s.trim(), f); } catch (DateTimeParseException ignored) { }
        }
        return null;
    }
}
