package com.sonic.angels.service;

import com.sonic.angels.model.dto.DreamDto;
import com.sonic.angels.model.entity.DatePrecision;
import com.sonic.angels.model.entity.Dream;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.repository.DreamRepository;
import com.sonic.angels.repository.LifeEventRepository;
import com.sonic.angels.repository.PersonRepository;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Dreams (giấc mơ) of a person, one record per dream. Apart from memories and writings: a dream did not happen, so its
 * text (content) and what it calls up in waking life (associations) stay two texts, and the events it calls up are
 * only referred to.
 */
@Service
@Transactional
public class DreamService {

    /** how much of a dream a list shows, and how much it reads to cut that from */
    static final int LEAD = 200, LEAD_READ = 260;

    private final DreamRepository repo;
    private final PersonRepository personRepo;
    private final LifeEventRepository eventRepo;
    private final NamedParameterJdbcTemplate jdbc;
    private final DtoMapper mapper;

    public DreamService(DreamRepository repo, PersonRepository personRepo, LifeEventRepository eventRepo,
                        NamedParameterJdbcTemplate jdbc, DtoMapper mapper) {
        this.repo = repo; this.personRepo = personRepo; this.eventRepo = eventRepo; this.jdbc = jdbc; this.mapper = mapper;
    }

    // ── read ────────────────────────────────────────────────────────────────

    /** A person's dreams, the newest morning first and, within a morning, in the order he told them. from / to: days,
     *  both kept. withPersonId: the dreams someone appears in; eventId: the dreams that call up this event. q: every
     *  word of it starts a word of the dream, its title, what it calls up or the name of someone in it (marks optional,
     *  as in the memories' search); the best matches first. Statements: the dreams in one, then one for the people and
     *  one for the events when asked (or searched), whatever the number of dreams. */
    @Transactional(readOnly = true)
    public List<DreamDto.Item> list(UUID personId, LocalDate from, LocalDate to, UUID withPersonId, UUID eventId,
                                    String q, DreamDto.Includes inc) {
        String needle = q == null || q.isBlank() ? null : q.trim();
        // the texts are read whole only when they are sent or searched; a plain list reads the opening of each
        boolean whole = inc.content() || needle != null;
        StringBuilder sql = new StringBuilder("SELECT id, person_id, dreamt_on, sort_order, title, created_at, updated_at, char_length(content) AS len, ")
            .append(whole ? "content, associations" : "LEFT(content, " + LEAD_READ + ") AS content, NULL AS associations")
            .append(" FROM dreams WHERE person_id = :owner");
        MapSqlParameterSource m = new MapSqlParameterSource("owner", owner(personId));
        if (from != null) { sql.append(" AND dreamt_on >= :from"); m.addValue("from", from); }
        if (to != null) { sql.append(" AND dreamt_on <= :to"); m.addValue("to", to); }
        if (withPersonId != null) { sql.append(" AND id IN (SELECT dream_id FROM dream_persons WHERE person_id = :with)"); m.addValue("with", withPersonId); }
        if (eventId != null) { sql.append(" AND id IN (SELECT dream_id FROM dream_life_events WHERE life_event_id = :event)"); m.addValue("event", eventId); }
        sql.append(" ORDER BY dreamt_on DESC, sort_order ASC NULLS LAST, created_at ASC");
        Map<UUID, Integer> length = new HashMap<>();
        List<DreamDto.Item> items = jdbc.query(sql.toString(), m, (rs, n) -> {
            DreamDto.Item it = new DreamDto.Item();
            it.id = rs.getObject("id", UUID.class);
            it.personId = rs.getObject("person_id", UUID.class);
            it.dreamtOn = rs.getObject("dreamt_on", LocalDate.class);
            it.sortOrder = (Integer) rs.getObject("sort_order");
            it.title = rs.getString("title");
            it.content = rs.getString("content");
            it.associations = rs.getString("associations");
            it.createdAt = rs.getObject("created_at", LocalDateTime.class);
            it.updatedAt = rs.getObject("updated_at", LocalDateTime.class);
            length.put(it.id, rs.getInt("len"));
            return it;
        });
        List<UUID> ids = items.stream().map(x -> x.id).toList();
        Map<UUID, List<DreamDto.PersonRef>> people = inc.persons() || needle != null ? personsOf(ids) : Map.of();
        if (needle != null) items = search(items, needle, people);
        for (DreamDto.Item it : items) {
            it.lead = lead(it.content, length.getOrDefault(it.id, 0));
            if (!inc.content()) { it.content = null; it.associations = null; }
            if (inc.persons()) it.persons = people.getOrDefault(it.id, List.of());
        }
        if (inc.events()) {
            Map<UUID, List<DreamDto.EventRef>> events = eventsOf(items.stream().map(x -> x.id).toList());
            items.forEach(it -> it.events = events.getOrDefault(it.id, List.of()));
        }
        return items;
    }

    /** One dream, whole: both texts, the people in it (with their pictures), the events it calls up. */
    @Transactional(readOnly = true)
    public DreamDto.Item detail(UUID id) {
        Dream d = get(id);
        DreamDto.Item it = new DreamDto.Item();
        it.id = d.getId();
        it.personId = d.getPerson().getId();
        it.dreamtOn = d.getDreamtOn();
        it.sortOrder = d.getSortOrder();
        it.title = d.getTitle();
        it.content = d.getContent();
        it.associations = d.getAssociations();
        it.lead = lead(d.getContent(), d.getContent().length());
        it.createdAt = d.getCreatedAt();
        it.updatedAt = d.getUpdatedAt();
        it.persons = d.getPersons().stream()
            .sorted(Comparator.comparing((Person p) -> Objects.toString(p.getName(), "")))
            .map(p -> new DreamDto.PersonRef(p.getId(), p.getName(), p.getDisplayName(), p.getNickname(), mapper.toPersonSummary(p).getAvatarUrl()))
            .toList();
        it.events = eventsOf(List.of(d.getId())).getOrDefault(d.getId(), List.of());
        return it;
    }

    // ── write ───────────────────────────────────────────────────────────────

    public DreamDto.Item create(DreamDto.Request r) {
        if (r.content == null || r.content.isBlank()) throw new IllegalArgumentException("content is required: the dream as he told it");
        if (r.dreamtOn == null || r.dreamtOn.isBlank()) throw new IllegalArgumentException("dreamtOn is required (yyyy-MM-dd)");
        Dream d = new Dream();
        d.setPerson(personRepo.findById(owner(r.personId)).orElseThrow(() -> new IllegalArgumentException("Person not found: " + r.personId)));
        apply(d, r);
        // a second dream of the same morning goes after the first, as he told them
        if (d.getSortOrder() == null) d.setSortOrder(nextOrder(d.getPerson().getId(), d.getDreamtOn()));
        repo.saveAndFlush(d);
        return detail(d.getId());
    }

    public DreamDto.Item update(UUID id, DreamDto.Request r) {
        Dream d = get(id);
        apply(d, r);
        repo.saveAndFlush(d);
        return detail(d.getId());
    }

    /** The dream goes, and its links with it; the people and the events stay. */
    public void delete(UUID id) {
        Dream d = get(id);
        d.getPersons().clear();
        d.getLifeEvents().clear();
        repo.delete(d);
    }

    /** A person goes: the dreams they had go with them, and they leave the dreams they appeared in. */
    public void forgetPerson(UUID personId) {
        MapSqlParameterSource m = new MapSqlParameterSource("p", personId);
        jdbc.update("DELETE FROM dream_persons WHERE person_id = :p OR dream_id IN (SELECT id FROM dreams WHERE person_id = :p)", m);
        jdbc.update("DELETE FROM dream_life_events WHERE dream_id IN (SELECT id FROM dreams WHERE person_id = :p)", m);
        jdbc.update("DELETE FROM dreams WHERE person_id = :p", m);
    }

    private void apply(Dream d, DreamDto.Request r) {
        if (r.dreamtOn != null && !r.dreamtOn.isBlank()) d.setDreamtOn(day(r.dreamtOn));
        if (r.sortOrder != null) d.setSortOrder(r.sortOrder);
        if (r.title != null) {
            String t = blankToNull(r.title);
            if (t != null && t.length() > 300) throw new IllegalArgumentException("title is longer than 300 characters");
            d.setTitle(t);
        }
        if (r.content != null) {
            if (r.content.isBlank()) throw new IllegalArgumentException("content cannot be empty: it is the dream itself");
            d.setContent(r.content.strip());
        }
        if (r.associations != null) d.setAssociations(blankToNull(r.associations));
        if (r.personIds != null) {
            // the dreamer is in every dream of theirs: never listed among the people in it
            UUID dreamer = d.getPerson().getId();
            d.getPersons().clear();
            d.getPersons().addAll(personRepo.findAllById(r.personIds.stream().filter(Objects::nonNull).filter(x -> !x.equals(dreamer)).distinct().toList()));
        }
        if (r.eventIds != null) {
            d.getLifeEvents().clear();
            d.getLifeEvents().addAll(eventRepo.findAllById(r.eventIds.stream().filter(Objects::nonNull).distinct().toList()));
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Dream get(UUID id) { return repo.findById(id).orElseThrow(() -> new NoSuchElementException("Dream not found: " + id)); }

    /** The dreamer: the one asked, else the owner of the hub. */
    private UUID owner(UUID personId) {
        if (personId != null) return personId;
        return personRepo.findByIsSelfTrue().map(Person::getId).orElseThrow(() -> new IllegalArgumentException("personId is required"));
    }

    private int nextOrder(UUID person, LocalDate day) {
        Integer max = jdbc.queryForObject("SELECT MAX(sort_order) FROM dreams WHERE person_id = :p AND dreamt_on = :d",
            new MapSqlParameterSource("p", person).addValue("d", day), Integer.class);
        return max == null ? 1 : max + 1;
    }

    /** the people in these dreams, by dream, in one statement (no pictures: a list does not show them) */
    private Map<UUID, List<DreamDto.PersonRef>> personsOf(List<UUID> ids) {
        Map<UUID, List<DreamDto.PersonRef>> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        jdbc.query("SELECT dp.dream_id, p.id, p.name, p.display_name, p.nickname FROM dream_persons dp JOIN persons p ON p.id = dp.person_id "
                + "WHERE dp.dream_id IN (:ids) ORDER BY p.name", new MapSqlParameterSource("ids", ids),
            rs -> {
                out.computeIfAbsent(rs.getObject("dream_id", UUID.class), k -> new ArrayList<>()).add(new DreamDto.PersonRef(
                    rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("display_name"), rs.getString("nickname"), null));
            });
        return out;
    }

    /** the events these dreams call up, by dream, in one statement, oldest first */
    private Map<UUID, List<DreamDto.EventRef>> eventsOf(List<UUID> ids) {
        Map<UUID, List<DreamDto.EventRef>> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        jdbc.query("SELECT de.dream_id, e.id, e.title, e.kind, e.start_at, e.start_precision, e.approx, e.end_at FROM dream_life_events de "
                + "JOIN life_events e ON e.id = de.life_event_id WHERE de.dream_id IN (:ids) ORDER BY e.start_at", new MapSqlParameterSource("ids", ids),
            rs -> {
                String p = rs.getString("start_precision");
                String when = LifeEventService.whenText(rs.getObject("start_at", LocalDateTime.class), p == null ? null : DatePrecision.valueOf(p),
                    rs.getBoolean("approx"), rs.getObject("end_at", LocalDateTime.class));
                out.computeIfAbsent(rs.getObject("dream_id", UUID.class), k -> new ArrayList<>()).add(new DreamDto.EventRef(
                    rs.getObject("id", UUID.class), rs.getString("title"), rs.getString("kind"), when));
            });
        return out;
    }

    /** the dreams q finds, the best first: the whole of q in the title counts most, then the whole of q anywhere, then
     *  each of its words met as a whole word; among equals the newest morning stays first */
    private static List<DreamDto.Item> search(List<DreamDto.Item> items, String q, Map<UUID, List<DreamDto.PersonRef>> people) {
        // typed with its marks ("mơ") it matches them exactly; typed without ("mo") it matches any marks
        boolean marks = !MemoryService.fold(q).equals(MemoryService.lower(q));
        List<String> words = words(norm(q, marks));
        if (words.isEmpty()) return items;
        String phrase = String.join(" ", words);
        record Hit(DreamDto.Item item, int score) {}
        List<Hit> hits = new ArrayList<>();
        for (DreamDto.Item it : items) {
            StringBuilder hay = new StringBuilder();
            for (String s : new String[] { it.title, it.content, it.associations }) if (s != null) hay.append(s).append(' ');
            for (DreamDto.PersonRef p : people.getOrDefault(it.id, List.of()))
                hay.append(p.name()).append(' ').append(Objects.toString(p.displayName(), "")).append(' ').append(Objects.toString(p.nickname(), "")).append(' ');
            List<String> tokens = words(norm(hay.toString(), marks));
            // every word of the query starts a word of the dream: "an" finds "ăn", not "bàn"
            if (!words.stream().allMatch(w -> tokens.stream().anyMatch(t -> t.startsWith(w)))) continue;
            String title = String.join(" ", words(norm(it.title, marks))), text = String.join(" ", tokens);
            Set<String> whole = new HashSet<>(tokens);
            int s = 0;
            if ((" " + title + " ").contains(" " + phrase + " ")) s += 8; else if (title.contains(phrase)) s += 4;
            if ((" " + text + " ").contains(" " + phrase + " ")) s += 2;
            s += (int) words.stream().filter(whole::contains).count();
            hits.add(new Hit(it, s));
        }
        hits.sort(Comparator.comparingInt(Hit::score).reversed());   // a stable sort: the date order stays among equals
        return hits.stream().map(Hit::item).toList();
    }

    private static String norm(String s, boolean marks) { return marks ? MemoryService.lower(s) : MemoryService.fold(s); }

    private static List<String> words(String s) {
        return Arrays.stream(s.split("[^\\p{L}\\p{N}]+")).filter(w -> !w.isBlank()).toList();
    }

    /** the opening of a dream for a list: up to LEAD characters, cut after a word; "…" when there is more.
     *  length = how long the whole text is (a list reads only its opening). */
    static String lead(String content, int length) {
        if (content == null) return null;
        String t = content.strip().replaceAll("\\s+", " ");
        if (t.length() <= LEAD) return length > content.length() ? t + "…" : t;
        int cut = t.lastIndexOf(' ', LEAD);
        return (cut > LEAD / 2 ? t.substring(0, cut) : t.substring(0, LEAD)).replaceAll("[\\s,;:–-]+$", "") + "…";
    }

    /** yyyy-MM-dd (anything after the day, such as an hour, is let go) */
    private static LocalDate day(String s) {
        String t = s.trim();
        try { return LocalDate.parse(t.length() > 10 ? t.substring(0, 10) : t); }
        catch (DateTimeParseException e) { throw new IllegalArgumentException("dreamtOn is not a day (yyyy-MM-dd): " + s); }
    }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.strip(); }
}
