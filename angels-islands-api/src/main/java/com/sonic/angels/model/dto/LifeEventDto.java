package com.sonic.angels.model.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Events (sự kiện): see {@link com.sonic.angels.model.entity.LifeEvent}. */
public class LifeEventDto {

    /** Create / update. On update a field left out (null) keeps what is there; a list given replaces the links.
     *  start: yyyy | yyyy-MM | yyyy-MM-dd | yyyy-MM-ddTHH:mm[:ss]; precision defaults to the form of start.
     *  end: the last day (or moment); empty string clears it. */
    public static class Request {
        public UUID personId;
        public String title, kind, summary, start, precision, end, place;
        public Boolean approx;
        public Double latitude, longitude;
        public Integer importance;
        /** parent event; the nil uuid clears it */
        public UUID parentId;
        /** inside a source import: the parent's externalKey */
        public String parentKey;
        public UUID coverMediaId;
        public String externalKey;
        public List<UUID> personIds, collectionIds, episodeIds, transactionIds;
    }

    public record PersonRef(UUID id, String name, String nickname, String avatarUrl) {}
    public record AlbumRef(UUID id, String name, Integer mediaCount, String thumbnailUrl, UUID parentId) {}
    public record MemoryRef(UUID id, String title, String summary, String when, LocalDateTime occurredAt, String kind) {}
    public record TransactionRef(UUID id, LocalDateTime occurredAt, BigDecimal amount, String currency,
                                 BigDecimal originalAmount, String originalCurrency, String kind, String description,
                                 String payeeName, String category, String account) {}
    /** money of the event in one currency: out = spent (positive), in = received */
    public record Money(String currency, BigDecimal out, BigDecimal in, int count) {}

    public static class Summary {
        public UUID id, personId, parentId, coverMediaId;
        public String title, kind, summary, place, when, precision, source, externalKey, coverUrl;
        public LocalDateTime startAt, endAt, endExclusive;
        public Boolean approx;
        public Integer importance;
        public Double latitude, longitude;
        public int albums, memories, transactions, people, children;
        public List<Money> money;
    }

    public static class Detail extends Summary {
        public Summary parent;
        public List<Summary> childEvents;
        public List<PersonRef> persons;
        public List<AlbumRef> albumList;
        public List<MemoryRef> memoryList;
        public List<TransactionRef> transactionList;
    }

    /** Where a moment falls: the events it is inside (shortest first), the one that ended last before it, the next one. */
    public record At(LocalDateTime moment, List<Summary> current, Summary previous, Summary next) {}
}
