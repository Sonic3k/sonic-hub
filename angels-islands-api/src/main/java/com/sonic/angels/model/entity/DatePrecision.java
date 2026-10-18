package com.sonic.angels.model.entity;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/** How far an event date is known: the stored date is the START of that span (1998-06-01 for "summer 1998"). */
public enum DatePrecision {
    DECADE, YEAR, SEASON, MONTH, DAY, HOUR, MINUTE, SECOND;

    /** Sort rank when two files share a moment: the vaguer one first. Files with only a camera / file date rank last. */
    public int rank() { return ordinal() + 1; }
    public static final int DIGITAL_RANK = values().length + 1;

    /** The start of the span this precision describes, from any moment inside it. */
    public LocalDateTime floor(LocalDateTime t) {
        return switch (this) {
            case DECADE -> LocalDateTime.of(t.getYear() - Math.floorMod(t.getYear(), 10), 1, 1, 0, 0);
            case YEAR -> LocalDateTime.of(t.getYear(), 1, 1, 0, 0);
            case SEASON -> {   // Xuân 03-05, Hè 06-08, Thu 09-11, Đông 12-02 (Jan/Feb belong to the previous December)
                int m = t.getMonthValue();
                int start = m >= 3 ? ((m - 3) / 3) * 3 + 3 : 12;
                yield LocalDateTime.of(m >= 3 ? t.getYear() : t.getYear() - 1, start, 1, 0, 0);
            }
            case MONTH -> LocalDateTime.of(t.getYear(), t.getMonthValue(), 1, 0, 0);
            case DAY -> t.truncatedTo(ChronoUnit.DAYS);
            case HOUR -> t.truncatedTo(ChronoUnit.HOURS);
            case MINUTE -> t.truncatedTo(ChronoUnit.MINUTES);
            case SECOND -> t.truncatedTo(ChronoUnit.SECONDS);
        };
    }

    /** The end (exclusive) of the span that starts at {@code start}. */
    public LocalDateTime end(LocalDateTime start) {
        return switch (this) {
            case DECADE -> start.plusYears(10);
            case YEAR -> start.plusYears(1);
            case SEASON -> start.plusMonths(3);
            case MONTH -> start.plusMonths(1);
            case DAY -> start.plusDays(1);
            case HOUR -> start.plusHours(1);
            case MINUTE -> start.plusMinutes(1);
            case SECOND -> start.plusSeconds(1);
        };
    }
}
