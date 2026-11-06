package com.sonic.angels.util;

import com.sonic.angels.model.entity.DatePrecision;

import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Times of the Social Media portal. The database keeps UTC in naive columns, like the rest of the API.
 * Written values: with Z or an offset they are absolute; without, Vietnam wall-clock. How much of the value is given
 * says how much is known ("2012" is a YEAR, "2012-03-12" a DAY); the stored time is the start of that span, cut in
 * Vietnam time.
 */
public final class SocialTime {

    public static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final Pattern YEAR = Pattern.compile("^(\\d{4})$");
    private static final Pattern MONTH = Pattern.compile("^(\\d{4})-(\\d{1,2})$");
    private static final Pattern DAY = Pattern.compile("^(\\d{4})-(\\d{1,2})-(\\d{1,2})$");
    private static final Pattern TIME = Pattern.compile(
        "^(\\d{4})-(\\d{1,2})-(\\d{1,2})[T ](\\d{1,2}):(\\d{2})(?::(\\d{2})(?:\\.\\d+)?)?(Z|[+-]\\d{2}:?\\d{2})?$");

    private SocialTime() {}

    /** A moment and how much of it is known. */
    public record Moment(LocalDateTime utc, DatePrecision precision) {}

    /** Reads a written time; null for blank. Throws IllegalArgumentException on anything else it cannot read. */
    public static Moment parse(String s) {
        if (s == null || s.isBlank()) return null;
        String v = s.trim();
        Matcher m;
        try {
            if ((m = YEAR.matcher(v)).matches())
                return vn(LocalDateTime.of(Integer.parseInt(m.group(1)), 1, 1, 0, 0), DatePrecision.YEAR);
            if ((m = MONTH.matcher(v)).matches())
                return vn(LocalDateTime.of(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), 1, 0, 0), DatePrecision.MONTH);
            if ((m = DAY.matcher(v)).matches())
                return vn(LocalDate.of(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3))).atStartOfDay(), DatePrecision.DAY);
            if ((m = TIME.matcher(v)).matches()) {
                LocalDateTime local = LocalDateTime.of(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)),
                    Integer.parseInt(m.group(4)), Integer.parseInt(m.group(5)), m.group(6) == null ? 0 : Integer.parseInt(m.group(6)));
                DatePrecision p = m.group(6) == null ? DatePrecision.MINUTE : DatePrecision.SECOND;
                String off = m.group(7);
                if (off == null) return vn(local, p);
                ZoneOffset zo = "Z".equals(off) ? ZoneOffset.UTC : ZoneOffset.of(off.length() == 5 ? off.substring(0, 3) + ":" + off.substring(3) : off);
                return new Moment(local.atOffset(zo).withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime(), p);
            }
        } catch (DateTimeException e) {
            throw new IllegalArgumentException("not a date: " + s);
        }
        try {   // anything else ISO can read (an instant with fractions, a zoned time)
            return new Moment(OffsetDateTime.parse(v).withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime(), DatePrecision.SECOND);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("not a date: " + s);
        }
    }

    /** A Vietnam wall-clock time cut to its precision, in UTC. */
    private static Moment vn(LocalDateTime local, DatePrecision p) {
        LocalDateTime floored = p.floor(local);
        return new Moment(floored.atZone(VN).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime(), p);
    }

    /** The UTC moment of a written time, or null. */
    public static LocalDateTime utc(String s) {
        Moment m = parse(s);
        return m == null ? null : m.utc();
    }

    /** A written calendar date ("2005", "2005-09", "2005-09-05"), kept as the first day of the span. */
    public static LocalDate date(String s) {
        if (s == null || s.isBlank()) return null;
        String v = s.trim();
        Matcher m;
        try {
            if ((m = YEAR.matcher(v)).matches()) return LocalDate.of(Integer.parseInt(m.group(1)), 1, 1);
            if ((m = MONTH.matcher(v)).matches()) return LocalDate.of(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), 1);
            if ((m = DAY.matcher(v)).matches()) return LocalDate.of(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)));
        } catch (DateTimeException e) {
            throw new IllegalArgumentException("not a date: " + s);
        }
        throw new IllegalArgumentException("not a date (YYYY, YYYY-MM or YYYY-MM-DD): " + s);
    }

    /** How much a written calendar date says. */
    public static DatePrecision datePrecision(String s) {
        if (s == null || s.isBlank()) return null;
        String v = s.trim();
        if (YEAR.matcher(v).matches()) return DatePrecision.YEAR;
        if (MONTH.matcher(v).matches()) return DatePrecision.MONTH;
        return DatePrecision.DAY;
    }

    /** A UTC moment as a Vietnam calendar day. */
    public static LocalDate vnDay(LocalDateTime utc) {
        return utc.atZone(ZoneOffset.UTC).withZoneSameInstant(VN).toLocalDate();
    }

    /** Reads a stored timestamp a native query hands back, whatever type the driver chose. */
    public static LocalDateTime fromDb(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDateTime l) return l;
        if (o instanceof java.sql.Timestamp ts) return ts.toLocalDateTime();
        if (o instanceof OffsetDateTime odt) return odt.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();
        if (o instanceof Instant i) return LocalDateTime.ofInstant(i, ZoneOffset.UTC);
        return LocalDateTime.parse(o.toString().replace(' ', 'T'));
    }
}
