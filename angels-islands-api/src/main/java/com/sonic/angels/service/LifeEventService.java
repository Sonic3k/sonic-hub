package com.sonic.angels.service;

import com.sonic.angels.model.dto.EventDateDto;
import com.sonic.angels.model.dto.LifeEventDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/** Events (sự kiện) of a person's life, and what belongs to them: albums, memories, money, people. */
@Service
@Transactional
public class LifeEventService {

    private static final UUID NIL = new UUID(0, 0);

    private final LifeEventRepository repo;
    private final PersonRepository personRepo;
    private final MediaFileRepository mediaRepo;
    private final CollectionRepository collectionRepo;
    private final NamedParameterJdbcTemplate jdbc;
    private final DtoMapper mapper;
    private final CollectionService collectionService;

    public LifeEventService(LifeEventRepository repo, PersonRepository personRepo, MediaFileRepository mediaRepo,
                            CollectionRepository collectionRepo, NamedParameterJdbcTemplate jdbc, DtoMapper mapper,
                            CollectionService collectionService) {
        this.repo = repo; this.personRepo = personRepo; this.mediaRepo = mediaRepo;
        this.collectionRepo = collectionRepo; this.jdbc = jdbc; this.mapper = mapper;
        this.collectionService = collectionService;
    }

    // ── read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LifeEventDto.Summary> list(UUID personId, LocalDateTime from, LocalDateTime to, String kind, String q) {
        UUID owner = owner(personId);
        String needle = q == null || q.isBlank() ? null : q.trim().toLowerCase();
        List<LifeEvent> all = repo.findByPersonIdOrderByStartAtAsc(owner).stream()
            .filter(e -> from == null || e.endExclusive().isAfter(from))
            .filter(e -> to == null || e.getStartAt().isBefore(to))
            .filter(e -> kind == null || kind.isBlank() || kind.trim().equalsIgnoreCase(e.getKind()))
            .filter(e -> needle == null || (e.getTitle() + " " + Objects.toString(e.getPlace(), "") + " " + Objects.toString(e.getSummary(), ""))
                .toLowerCase().contains(needle))
            .toList();
        return summaries(all);
    }

    @Transactional(readOnly = true)
    public LifeEventDto.Detail detail(UUID id) {
        LifeEvent e = get(id);
        LifeEventDto.Detail d = new LifeEventDto.Detail();
        fill(d, e, counts(List.of(e.getId())));
        if (e.getCoverMediaId() != null) mediaRepo.findById(e.getCoverMediaId()).map(mapper::imageUrl).ifPresent(u -> d.coverUrl = u);
        if (e.getParent() != null) d.parent = summaries(List.of(e.getParent())).get(0);
        d.childEvents = summaries(repo.findByParentIdOrderByStartAtAsc(e.getId()));
        d.persons = e.getPersons().stream()
            .sorted(Comparator.comparing(p -> Objects.toString(p.getName(), "")))
            .map(p -> { var s = mapper.toPersonSummary(p); return new LifeEventDto.PersonRef(p.getId(), p.getName(), p.getNickname(), s.getAvatarUrl()); })
            .toList();
        MapSqlParameterSource m = new MapSqlParameterSource("id", e.getId());
        List<UUID> albumIds = jdbc.queryForList("SELECT id FROM collections WHERE life_event_id = :id ORDER BY name", m, UUID.class);
        List<com.sonic.angels.model.entity.Collection> albums = collectionRepo.findAllById(albumIds);
        Map<UUID, String> covers = collectionService.coverUrls(albums);   // the cover set, else the album's first picture
        d.albumList = albums.stream()
            .sorted(Comparator.comparing(c -> Objects.toString(c.getName(), "")))
            .map(c -> new LifeEventDto.AlbumRef(c.getId(), c.getName(), countMedia(c.getId()), covers.get(c.getId()),
                c.getParent() != null ? c.getParent().getId() : null))
            .toList();
        d.memoryList = jdbc.query("SELECT id, title, summary, occurred_at, occurred_precision, occurred_approx, kind FROM episodes "
                + "WHERE life_event_id = :id ORDER BY occurred_at NULLS LAST, title", m,
            (rs, n) -> {
                LocalDateTime at = rs.getTimestamp("occurred_at") != null ? rs.getTimestamp("occurred_at").toLocalDateTime() : null;
                String p = rs.getString("occurred_precision");
                return new LifeEventDto.MemoryRef(rs.getObject("id", UUID.class), rs.getString("title"), rs.getString("summary"),
                    whenText(at, p == null ? null : DatePrecision.valueOf(p), rs.getBoolean("occurred_approx"), null), at, rs.getString("kind"));
            });
        d.transactionList = jdbc.query("SELECT t.id, t.occurred_at, t.amount, a.currency, a.name AS account, t.original_amount, t.original_currency, "
                + "t.kind, t.description, t.payee_name, c.name AS category FROM finance_transactions t "
                + "JOIN finance_accounts a ON a.id = t.account_id LEFT JOIN finance_categories c ON c.id = t.category_id "
                + "WHERE t.life_event_id = :id ORDER BY t.occurred_at", m,
            (rs, n) -> new LifeEventDto.TransactionRef(rs.getObject("id", UUID.class), rs.getTimestamp("occurred_at").toLocalDateTime(),
                rs.getBigDecimal("amount"), rs.getString("currency"), rs.getBigDecimal("original_amount"), rs.getString("original_currency"),
                rs.getString("kind"), rs.getString("description"), rs.getString("payee_name"), rs.getString("category"), rs.getString("account")));
        return d;
    }

    /** The events a moment is inside (the shortest first), the one that ended last before it and the next one to start. */
    @Transactional(readOnly = true)
    public LifeEventDto.At at(UUID personId, LocalDateTime moment) {
        List<LifeEvent> all = repo.findByPersonIdOrderByStartAtAsc(owner(personId));
        List<LifeEvent> current = all.stream()
            .filter(e -> !e.getStartAt().isAfter(moment) && e.endExclusive().isAfter(moment))
            .sorted(Comparator.comparing((LifeEvent e) -> java.time.Duration.between(e.getStartAt(), e.endExclusive())))
            .toList();
        LifeEvent prev = all.stream().filter(e -> !e.endExclusive().isAfter(moment))
            .max(Comparator.comparing(LifeEvent::endExclusive)).orElse(null);
        LifeEvent next = all.stream().filter(e -> e.getStartAt().isAfter(moment))
            .min(Comparator.comparing(LifeEvent::getStartAt)).orElse(null);
        List<LifeEvent> want = new ArrayList<>(current);
        if (prev != null) want.add(prev);
        if (next != null) want.add(next);
        Map<UUID, LifeEventDto.Summary> s = summaries(want).stream().collect(Collectors.toMap(x -> x.id, x -> x, (a, b) -> a));
        return new LifeEventDto.At(moment, current.stream().map(e -> s.get(e.getId())).toList(),
            prev == null ? null : s.get(prev.getId()), next == null ? null : s.get(next.getId()));
    }

    // ── write ───────────────────────────────────────────────────────────────

    public LifeEventDto.Detail create(LifeEventDto.Request r) {
        if (r.title == null || r.title.isBlank()) throw new IllegalArgumentException("title is required");
        if (r.start == null || r.start.isBlank()) throw new IllegalArgumentException("start is required");
        LifeEvent e = new LifeEvent();
        e.setPerson(personRepo.findById(owner(r.personId)).orElseThrow(() -> new IllegalArgumentException("Person not found: " + r.personId)));
        apply(e, r, null);
        repo.save(e);
        links(e, r);
        return detail(e.getId());
    }

    public LifeEventDto.Detail update(UUID id, LifeEventDto.Request r) {
        LifeEvent e = get(id);
        apply(e, r, null);
        repo.save(e);
        links(e, r);
        return detail(e.getId());
    }

    /** The event goes; its albums, memories and money stay, no longer linked; its parts move up to its parent. */
    public void delete(UUID id) {
        LifeEvent e = get(id);
        MapSqlParameterSource m = new MapSqlParameterSource("id", id).addValue("parent", e.getParent() != null ? e.getParent().getId() : null, java.sql.Types.OTHER);
        jdbc.update("UPDATE collections SET life_event_id = NULL WHERE life_event_id = :id", m);
        jdbc.update("UPDATE episodes SET life_event_id = NULL WHERE life_event_id = :id", m);
        jdbc.update("UPDATE finance_transactions SET life_event_id = NULL WHERE life_event_id = :id", m);
        jdbc.update("UPDATE life_events SET parent_id = :parent WHERE parent_id = :id", m);
        e.getPersons().clear();
        repo.delete(e);
    }

    /** Everything one importer wrote for this person, replaced: events matched by externalKey are updated (their id
     *  stays), new ones created, the ones no longer in the list deleted. parentKey links to another event of the list. */
    public Map<String, Object> replaceSource(UUID personId, String source, List<LifeEventDto.Request> items) {
        UUID owner = owner(personId);
        Person person = personRepo.findById(owner).orElseThrow(() -> new IllegalArgumentException("Person not found: " + owner));
        Map<String, LifeEvent> existing = new HashMap<>();
        for (LifeEvent e : repo.findByPersonIdAndSource(owner, source))
            if (e.getExternalKey() != null) existing.put(e.getExternalKey(), e);
        Map<String, LifeEvent> kept = new LinkedHashMap<>();
        int created = 0, updated = 0;
        for (LifeEventDto.Request r : items) {
            if (r.externalKey == null || r.externalKey.isBlank()) throw new IllegalArgumentException("externalKey is required in a source import");
            LifeEvent e = existing.get(r.externalKey);
            if (e == null) { e = new LifeEvent(); e.setPerson(person); e.setSource(source); e.setExternalKey(r.externalKey); created++; }
            else updated++;
            apply(e, r, null);
            repo.save(e);
            kept.put(r.externalKey, e);
        }
        for (LifeEventDto.Request r : items) {
            LifeEvent e = kept.get(r.externalKey);
            if (r.parentKey != null) e.setParent(r.parentKey.isBlank() ? null : kept.get(r.parentKey));
            links(e, r);
        }
        int deleted = 0;
        for (var x : existing.entrySet())
            if (!kept.containsKey(x.getKey())) { delete(x.getValue().getId()); deleted++; }
        return Map.of("source", source, "created", created, "updated", updated, "deleted", deleted);
    }

    private void apply(LifeEvent e, LifeEventDto.Request r, Void unused) {
        if (r.title != null) e.setTitle(r.title.trim());
        if (r.kind != null) e.setKind(r.kind.isBlank() ? null : r.kind.trim().toUpperCase());
        if (r.summary != null) e.setSummary(r.summary.isBlank() ? null : r.summary);
        if (r.start != null && !r.start.isBlank()) {
            EventDateDto d = new EventDateDto(); d.setDate(r.start); d.setPrecision(r.precision);
            DatePrecision p = d.parsedPrecision();
            e.setPrecision(p);
            e.setStartAt(p.floor(d.parsedDate()));
        } else if (r.precision != null && !r.precision.isBlank() && e.getStartAt() != null) {
            DatePrecision p = DatePrecision.valueOf(r.precision.trim().toUpperCase());
            e.setPrecision(p); e.setStartAt(p.floor(e.getStartAt()));
        }
        if (r.approx != null) e.setApprox(r.approx ? Boolean.TRUE : null);
        if (r.end != null) {
            if (r.end.isBlank()) e.setEndAt(null);
            else { EventDateDto d = new EventDateDto(); d.setDate(r.end); e.setEndAt(d.parsedDate()); }
        }
        if (e.getEndAt() != null && e.getStartAt() != null && e.getEndAt().isBefore(e.getStartAt()))
            throw new IllegalArgumentException("end is before start");
        if (r.place != null) {
            e.setPlace(r.place.isBlank() ? null : r.place.trim());
            if (e.getPlace() == null) { e.setLatitude(null); e.setLongitude(null); }
        }
        if (r.latitude != null) e.setLatitude(r.latitude);
        if (r.longitude != null) e.setLongitude(r.longitude);
        if (r.importance != null) e.setImportance(r.importance);
        if (r.coverMediaId != null) e.setCoverMediaId(NIL.equals(r.coverMediaId) ? null : r.coverMediaId);
        if (r.parentId != null) {
            if (NIL.equals(r.parentId)) e.setParent(null);
            else {
                LifeEvent p = get(r.parentId);
                for (LifeEvent x = p; x != null; x = x.getParent())
                    if (e.getId() != null && x.getId().equals(e.getId())) throw new IllegalArgumentException("an event cannot be part of itself");
                e.setParent(p);
            }
        }
        if (r.externalKey != null && e.getSource() == null) e.setExternalKey(r.externalKey.isBlank() ? null : r.externalKey);
        if (r.personIds != null) {
            e.getPersons().clear();
            e.getPersons().addAll(personRepo.findAllById(r.personIds.stream().filter(Objects::nonNull).distinct().toList()));
        }
    }

    /** Albums, memories and transactions given: they belong to this event now (and the ones left out no longer do). */
    private void links(LifeEvent e, LifeEventDto.Request r) {
        repo.flush();
        relink("collections", e.getId(), r.collectionIds);
        relink("episodes", e.getId(), r.episodeIds);
        relink("finance_transactions", e.getId(), r.transactionIds);
    }

    private void relink(String table, UUID event, List<UUID> ids) {
        if (ids == null) return;
        List<UUID> want = ids.stream().filter(Objects::nonNull).distinct().toList();
        MapSqlParameterSource m = new MapSqlParameterSource("e", event);
        if (want.isEmpty()) { jdbc.update("UPDATE " + table + " SET life_event_id = NULL WHERE life_event_id = :e", m); return; }
        m.addValue("ids", want);
        jdbc.update("UPDATE " + table + " SET life_event_id = NULL WHERE life_event_id = :e AND id NOT IN (:ids)", m);
        jdbc.update("UPDATE " + table + " SET life_event_id = :e WHERE id IN (:ids)", m);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private LifeEvent get(UUID id) { return repo.findById(id).orElseThrow(() -> new NoSuchElementException("Event not found: " + id)); }

    /** The person the events are about: the one asked, else the owner of the hub. */
    private UUID owner(UUID personId) {
        if (personId != null) return personId;
        return personRepo.findByIsSelfTrue().map(Person::getId).orElseThrow(() -> new IllegalArgumentException("personId is required"));
    }

    private Integer countMedia(UUID albumId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM collection_media WHERE collection_id = :id", Map.of("id", albumId), Integer.class);
    }

    private record Counts(Map<UUID, Integer> albums, Map<UUID, Integer> memories, Map<UUID, Integer> transactions,
                          Map<UUID, Integer> people, Map<UUID, Integer> children, Map<UUID, List<LifeEventDto.Money>> money,
                          Map<UUID, String> albumCover) {}

    private Counts counts(List<UUID> ids) {
        if (ids.isEmpty()) return new Counts(Map.of(), Map.of(), Map.of(), Map.of(), Map.of(), Map.of(), Map.of());
        MapSqlParameterSource m = new MapSqlParameterSource("ids", ids);
        Map<UUID, List<LifeEventDto.Money>> money = new HashMap<>();
        jdbc.query("SELECT t.life_event_id AS e, a.currency, "
                + "SUM(CASE WHEN t.amount < 0 THEN -t.amount ELSE 0 END) AS out_sum, SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) AS in_sum, "
                + "COUNT(*) AS n FROM finance_transactions t JOIN finance_accounts a ON a.id = t.account_id "
                + "WHERE t.life_event_id IN (:ids) AND t.kind <> 'TRANSFER' GROUP BY t.life_event_id, a.currency ORDER BY a.currency", m,
            rs -> {
                money.computeIfAbsent(rs.getObject("e", UUID.class), k -> new ArrayList<>()).add(new LifeEventDto.Money(
                    rs.getString("currency"), nz(rs.getBigDecimal("out_sum")), nz(rs.getBigDecimal("in_sum")), rs.getInt("n")));
            });
        Map<UUID, String> cover = new HashMap<>();
        jdbc.query("SELECT DISTINCT ON (c.life_event_id) c.life_event_id AS e, m.poster_storage_key, m.file_type, m.storage_key, m.storage_provider "
                + "FROM collections c JOIN media_files m ON m.id = c.thumbnail_media_file_id WHERE c.life_event_id IN (:ids) ORDER BY c.life_event_id, c.name", m,
            rs -> {
                String ft = rs.getString("file_type"), sp = rs.getString("storage_provider");
                cover.put(rs.getObject("e", UUID.class), mapper.imageUrl(rs.getString("poster_storage_key"),
                    ft == null ? null : MediaFile.FileType.valueOf(ft), rs.getString("storage_key"), sp == null ? null : MediaFile.StorageProvider.valueOf(sp)));
            });
        // no album cover: the first photo of its albums, else the first photo of its memories
        List<UUID> bare = ids.stream().filter(x -> !cover.containsKey(x)).toList();
        if (!bare.isEmpty()) {
            MapSqlParameterSource b = new MapSqlParameterSource("ids", bare);
            org.springframework.jdbc.core.RowCallbackHandler put = rs -> {
                UUID e = rs.getObject("e", UUID.class);
                if (cover.containsKey(e)) return;
                String sp = rs.getString("storage_provider");
                cover.put(e, mapper.imageUrl(rs.getString("poster_storage_key"), MediaFile.FileType.IMAGE, rs.getString("storage_key"),
                    sp == null ? null : MediaFile.StorageProvider.valueOf(sp)));
            };
            jdbc.query("SELECT DISTINCT ON (c.life_event_id) c.life_event_id AS e, m.poster_storage_key, m.storage_key, m.storage_provider "
                + "FROM collections c JOIN collection_media cm ON cm.collection_id = c.id JOIN media_files m ON m.id = cm.media_file_id "
                + "WHERE c.life_event_id IN (:ids) AND m.file_type = 'IMAGE' ORDER BY c.life_event_id, m.effective_date NULLS LAST", b, put);
            jdbc.query("SELECT DISTINCT ON (ep.life_event_id) ep.life_event_id AS e, m.poster_storage_key, m.storage_key, m.storage_provider "
                + "FROM episodes ep JOIN episode_media em ON em.episode_id = ep.id JOIN media_files m ON m.id = em.media_file_id "
                + "WHERE ep.life_event_id IN (:ids) AND m.file_type = 'IMAGE' ORDER BY ep.life_event_id, ep.occurred_at NULLS LAST, em.position", b, put);
        }
        return new Counts(count("SELECT life_event_id AS e, COUNT(*) AS n FROM collections WHERE life_event_id IN (:ids) GROUP BY life_event_id", m),
            count("SELECT life_event_id AS e, COUNT(*) AS n FROM episodes WHERE life_event_id IN (:ids) GROUP BY life_event_id", m),
            count("SELECT life_event_id AS e, COUNT(*) AS n FROM finance_transactions WHERE life_event_id IN (:ids) GROUP BY life_event_id", m),
            count("SELECT life_event_id AS e, COUNT(*) AS n FROM life_event_persons WHERE life_event_id IN (:ids) GROUP BY life_event_id", m),
            count("SELECT parent_id AS e, COUNT(*) AS n FROM life_events WHERE parent_id IN (:ids) GROUP BY parent_id", m),
            money, cover);
    }

    private Map<UUID, Integer> count(String sql, MapSqlParameterSource m) {
        Map<UUID, Integer> out = new HashMap<>();
        jdbc.query(sql, m, rs -> { out.put(rs.getObject("e", UUID.class), rs.getInt("n")); });
        return out;
    }

    private List<LifeEventDto.Summary> summaries(List<LifeEvent> events) {
        Counts c = counts(events.stream().map(LifeEvent::getId).toList());
        Map<UUID, String> covers = new HashMap<>();
        List<UUID> coverIds = events.stream().map(LifeEvent::getCoverMediaId).filter(Objects::nonNull).distinct().toList();
        if (!coverIds.isEmpty()) for (MediaFile m : mediaRepo.findAllById(coverIds)) covers.put(m.getId(), mapper.imageUrl(m));
        List<LifeEventDto.Summary> out = new ArrayList<>();
        for (LifeEvent e : events) {
            LifeEventDto.Summary s = new LifeEventDto.Summary();
            fill(s, e, c);
            if (e.getCoverMediaId() != null && covers.get(e.getCoverMediaId()) != null) s.coverUrl = covers.get(e.getCoverMediaId());
            out.add(s);
        }
        return out;
    }

    private void fill(LifeEventDto.Summary s, LifeEvent e, Counts c) {
        s.id = e.getId(); s.personId = e.getPerson() != null ? e.getPerson().getId() : null;
        s.parentId = e.getParent() != null ? e.getParent().getId() : null;
        s.title = e.getTitle(); s.kind = e.getKind(); s.summary = e.getSummary(); s.place = e.getPlace();
        s.startAt = e.getStartAt(); s.endAt = e.getEndAt(); s.endExclusive = e.endExclusive();
        s.precision = e.getPrecision() != null ? e.getPrecision().name() : null; s.approx = Boolean.TRUE.equals(e.getApprox());
        s.when = whenText(e.getStartAt(), e.getPrecision(), Boolean.TRUE.equals(e.getApprox()), e.getEndAt());
        s.importance = e.getImportance(); s.latitude = e.getLatitude(); s.longitude = e.getLongitude();
        s.source = e.getSource(); s.externalKey = e.getExternalKey(); s.coverMediaId = e.getCoverMediaId();
        s.albums = c.albums().getOrDefault(e.getId(), 0); s.memories = c.memories().getOrDefault(e.getId(), 0);
        s.transactions = c.transactions().getOrDefault(e.getId(), 0); s.people = c.people().getOrDefault(e.getId(), 0);
        s.children = c.children().getOrDefault(e.getId(), 0); s.money = c.money().getOrDefault(e.getId(), List.of());
        s.coverUrl = c.albumCover().get(e.getId());
    }

    /** "2023-02-16", "2023-02", "2023", "2023-02-16 → 2023-02-20" ("~" in front when approximate). */
    static String whenText(LocalDateTime at, DatePrecision p, boolean approx, LocalDateTime end) {
        if (at == null) return null;
        String t = part(at, p == null ? DatePrecision.DAY : p);
        if (end != null) {
            String e = end.toLocalTime().equals(java.time.LocalTime.MIDNIGHT) ? end.toLocalDate().toString() : end.toString().replace('T', ' ');
            if (!e.equals(t)) t = t + " → " + e;
        }
        return approx ? "~" + t : t;
    }

    private static String part(LocalDateTime at, DatePrecision p) {
        String d = at.toLocalDate().toString();
        return switch (p) {
            case DECADE -> at.getYear() + "s";
            case YEAR -> d.substring(0, 4);
            case SEASON -> switch (at.getMonthValue()) { case 3, 4, 5 -> "Xuân "; case 6, 7, 8 -> "Hè "; case 9, 10, 11 -> "Thu "; default -> "Đông "; } + at.getYear();
            case MONTH -> d.substring(0, 7);
            case DAY -> d;
            default -> at.toString().replace('T', ' ');
        };
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
