package com.sonic.angels.model.dto;

import com.sonic.angels.model.entity.DatePrecision;
import java.time.LocalDateTime;
import java.util.UUID;

/** When the moment of a file / album really happened, as far as it is known.
 *  date = start of the known span (yyyy-MM-ddTHH:mm:ss; a bare yyyy, yyyy-MM or yyyy-MM-dd is accepted on input),
 *  precision = DECADE | YEAR | SEASON | MONTH | DAY | HOUR | MINUTE | SECOND, approx = "khoảng" (~).
 *  In a request: leave the whole object out to keep what is there; send it with an empty date to clear it.
 *  In a response: fromAlbumId is set when a file took its date from that album instead of having its own. */
public class EventDateDto {
    private String date; private String precision; private Boolean approx; private UUID fromAlbumId;
    public String getDate() { return date; } public void setDate(String v) { this.date = v; }
    public String getPrecision() { return precision; } public void setPrecision(String v) { this.precision = v; }
    public Boolean getApprox() { return approx; } public void setApprox(Boolean v) { this.approx = v; }
    public UUID getFromAlbumId() { return fromAlbumId; } public void setFromAlbumId(UUID v) { this.fromAlbumId = v; }

    public boolean clears() { return date == null || date.isBlank(); }

    public LocalDateTime parsedDate() {
        String v = date.trim();
        if (v.matches("\\d{4}")) v += "-01-01T00:00:00";
        else if (v.matches("\\d{4}-\\d{2}")) v += "-01T00:00:00";
        else if (v.matches("\\d{4}-\\d{2}-\\d{2}")) v += "T00:00:00";
        else if (v.length() == 16) v += ":00";
        return LocalDateTime.parse(v);
    }

    /** The precision given, else the one the date's own form implies (yyyy → YEAR, yyyy-MM → MONTH, ...). */
    public DatePrecision parsedPrecision() {
        if (precision != null && !precision.isBlank()) return DatePrecision.valueOf(precision.trim().toUpperCase());
        String v = date.trim();
        if (v.matches("\\d{4}")) return DatePrecision.YEAR;
        if (v.matches("\\d{4}-\\d{2}")) return DatePrecision.MONTH;
        if (v.matches("\\d{4}-\\d{2}-\\d{2}")) return DatePrecision.DAY;
        return v.length() == 16 ? DatePrecision.MINUTE : DatePrecision.SECOND;
    }

    public static EventDateDto of(LocalDateTime date, DatePrecision p, Boolean approx, UUID fromAlbumId) {
        if (date == null) return null;
        EventDateDto d = new EventDateDto();
        d.date = date.toString().length() == 16 ? date + ":00" : date.toString();
        d.precision = p != null ? p.name() : null; d.approx = Boolean.TRUE.equals(approx); d.fromAlbumId = fromAlbumId;
        return d;
    }
}
