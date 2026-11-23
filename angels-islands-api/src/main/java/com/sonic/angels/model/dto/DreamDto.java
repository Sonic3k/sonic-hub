package com.sonic.angels.model.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Dreams (giấc mơ): see {@link com.sonic.angels.model.entity.Dream}. */
public class DreamDto {

    /** Create / update. On update a field left out (null) keeps what is there, a blank text clears it (the content,
     *  being the dream itself, cannot be cleared); a list given replaces the links.
     *  dreamtOn: yyyy-MM-dd, the morning he woke up with it. sortOrder: left out on create, the dream goes after the
     *  ones already kept for that morning. personIds: who appears in it; eventIds: the real events it calls up. */
    public static class Request {
        public UUID personId;
        public String dreamtOn, title, content, associations;
        public Integer sortOrder;
        public List<UUID> personIds, eventIds;
    }

    /** What a list carries beyond its lines: the two texts (inclContent), who is in each dream (inclPersons), the
     *  events each calls up (inclEvents). A single dream always comes whole. */
    public record Includes(boolean content, boolean persons, boolean events) {
        public static final Includes ALL = new Includes(true, true, true);
    }

    /** avatarUrl only on a single dream; a list leaves it out */
    public record PersonRef(UUID id, String name, String displayName, String nickname, String avatarUrl) {}
    /** when: "2013-06-25 → 2013-07-01", "2015-08", as the events write it */
    public record EventRef(UUID id, String title, String kind, String when) {}

    public static class Item {
        public UUID id, personId;
        public LocalDate dreamtOn;
        public Integer sortOrder;
        public String title;
        /** the opening of the dream, a line or two of it, for a list */
        public String lead;
        /** the dream as he told it, and what it calls up in his waking life: only when asked, always on one dream */
        public String content, associations;
        public List<PersonRef> persons;
        public List<EventRef> events;
        public LocalDateTime createdAt, updatedAt;
    }
}
