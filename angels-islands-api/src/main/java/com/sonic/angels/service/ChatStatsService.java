package com.sonic.angels.service;

import com.sonic.angels.model.entity.Person;
import com.sonic.angels.repository.PersonRepository;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Chat numbers of a person, counted from every conversation filed under them — all their nicks and accounts on every
 * chat app together — as the data stands now, so a nick split out or an account linked later counts at once.
 * Facebook wall talk counts with Facebook. Rows with no time, empty rows and system lines (someone joined, a group was
 * renamed) are not messages. Days, months, hours, first and last are Vietnam time.
 */
@Service
public class ChatStatsService {

    /** The chat apps counted, in the order the charts stack them (the monthly rows carry one number per app). */
    public static final List<String> SERIES = List.of("facebook", "yahoo", "sms", "zalo");
    private static final String APPS = "a.platform IN ('FACEBOOK', 'YAHOO', 'SMS', 'ZALO')";
    private static final String MESSAGE = "m.timestamp IS NOT NULL AND (m.kind IS NULL OR m.kind <> 'EMPTY') AND m.sender_type <> 'SYSTEM'";
    private static final Duration SESSION_GAP = Duration.ofHours(6);       // a new conversation starts after 6 h of silence
    private static final ZoneOffset VN = ZoneOffset.ofHours(7);
    private static final DateTimeFormatter LOCAL = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final long BOARD_CACHE_MS = 10 * 60_000L;

    private final NamedParameterJdbcTemplate jdbc;
    private final PersonRepository personRepo;
    private volatile Map<String, Object> board;
    private volatile long boardAt;

    public ChatStatsService(NamedParameterJdbcTemplate jdbc, PersonRepository personRepo) {
        this.jdbc = jdbc;
        this.personRepo = personRepo;
    }

    private record Row(String app, LocalDateTime local, String side, boolean timed) {}

    /** facebook-wall for a wall archive, otherwise the app in lower case. */
    static String app(String platform, String externalKey) {
        if ("FACEBOOK".equals(platform) && externalKey != null && externalKey.startsWith("fbwall:")) return "facebook-wall";
        return platform.toLowerCase(Locale.ROOT);
    }

    private static int series(String app) { return app.startsWith("facebook") ? 0 : SERIES.indexOf(app); }

    private static LocalDateTime local(Timestamp utc) { return utc.toLocalDateTime().atOffset(ZoneOffset.UTC).withOffsetSameInstant(VN).toLocalDateTime(); }

    // ── One person ───────────────────────────────────────────────────────────

    public Map<String, Object> person(UUID personId) {
        List<Row> rows = jdbc.query(
            "SELECT a.platform, a.external_key, m.timestamp, m.sender_type, m.time_precision FROM chat_messages m " +
            "JOIN chat_archives a ON a.id = m.chat_archive_id WHERE a.person_id = :p AND " + APPS + " AND " + MESSAGE +
            " ORDER BY m.timestamp, m.seq",
            Map.of("p", personId),
            (rs, i) -> new Row(app(rs.getString(1), rs.getString(2)), local(rs.getTimestamp(3)), rs.getString(4),
                rs.getString(5) == null || "SECOND".equals(rs.getString(5)) || "MINUTE".equals(rs.getString(5))));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("messages", rows.size());
        if (rows.isEmpty()) return out;

        Map<String, Integer> byApp = new LinkedHashMap<>();
        int self = 0, them = 0;
        TreeMap<String, int[]> months = new TreeMap<>();
        LinkedHashMap<LocalDate, Integer> days = new LinkedHashMap<>();
        int[] hours = new int[24];
        for (Row r : rows) {
            byApp.merge(r.app(), 1, Integer::sum);
            if ("SELF".equals(r.side())) self++; else if ("PERSON".equals(r.side())) them++;
            int s = series(r.app());
            if (s >= 0) months.computeIfAbsent(r.local().toString().substring(0, 7), k -> new int[SERIES.size()])[s]++;
            days.merge(r.local().toLocalDate(), 1, Integer::sum);
            if (r.timed() && ("SELF".equals(r.side()) || "PERSON".equals(r.side()))) hours[r.local().getHour()]++;
        }
        out.put("by_platform", byApp);
        out.put("self", self);
        out.put("them", them);
        out.put("first", rows.get(0).local().format(LOCAL));
        out.put("last", rows.get(rows.size() - 1).local().format(LOCAL));

        List<List<Object>> monthly = new ArrayList<>();
        String peakMonth = null; int peakMonthN = -1;
        for (Map.Entry<String, int[]> e : months.entrySet()) {
            List<Object> row = new ArrayList<>(); row.add(e.getKey());
            int total = 0;
            for (int v : e.getValue()) { row.add(v); total += v; }
            monthly.add(row);
            if (total > peakMonthN) { peakMonthN = total; peakMonth = e.getKey(); }
        }
        out.put("monthly", monthly);
        out.put("peak_month", Map.of("month", peakMonth, "messages", peakMonthN));

        LocalDate peakDay = null; int peakDayN = -1;
        for (Map.Entry<LocalDate, Integer> e : days.entrySet())
            if (e.getValue() > peakDayN) { peakDayN = e.getValue(); peakDay = e.getKey(); }
        out.put("peak_day", Map.of("date", peakDay.toString(), "messages", peakDayN));
        out.put("active_days", days.size());

        // the longest run of days in a row with a message
        List<LocalDate> ds = new ArrayList<>(new TreeSet<>(days.keySet()));
        int best = 1, cur = 1; LocalDate bestEnd = ds.get(0);
        for (int i = 1; i < ds.size(); i++) {
            cur = ds.get(i - 1).plusDays(1).equals(ds.get(i)) ? cur + 1 : 1;
            if (cur > best) { best = cur; bestEnd = ds.get(i); }
        }
        out.put("longest_streak", Map.of("days", best, "from", bestEnd.minusDays(best - 1L).toString(), "to", bestEnd.toString()));

        // conversations: who opens one, how long the other takes to answer
        int sessions = 0;
        Map<String, Integer> starts = new LinkedHashMap<>();
        Map<String, List<Long>> reply = Map.of("self", new ArrayList<>(), "them", new ArrayList<>());
        Row prev = null;
        for (Row r : rows) {
            String side = "SELF".equals(r.side()) ? "self" : "PERSON".equals(r.side()) ? "them" : null;
            if (side == null) continue;
            if (prev == null || Duration.between(prev.local(), r.local()).compareTo(SESSION_GAP) >= 0) {
                sessions++;
                starts.merge(side, 1, Integer::sum);
            } else if (!side.equals("SELF".equals(prev.side()) ? "self" : "them")) {
                reply.get(side).add(Duration.between(prev.local(), r.local()).getSeconds());
            }
            prev = r;
        }
        out.put("conversations", sessions);
        out.put("started_by", starts);
        Map<String, Object> medians = new LinkedHashMap<>();
        reply.forEach((k, v) -> medians.put(k, median(v)));
        out.put("reply_median_s", medians);
        out.put("hours", hours);
        return out;
    }

    private static Double median(List<Long> xs) {
        if (xs.isEmpty()) return null;
        List<Long> s = new ArrayList<>(xs);
        Collections.sort(s);
        int n = s.size();
        return n % 2 == 1 ? s.get(n / 2).doubleValue() : (s.get(n / 2 - 1) + s.get(n / 2)) / 2.0;
    }

    // ── Every Angel ──────────────────────────────────────────────────────────

    /** The Angels by how many messages they have with him, every chat app and account together. */
    public Map<String, Object> board() {
        Map<String, Object> b = board;
        if (b != null && System.currentTimeMillis() - boardAt < BOARD_CACHE_MS) return b;
        Map<UUID, Map<String, Integer>> byApp = new HashMap<>();
        Map<UUID, LocalDateTime[]> span = new HashMap<>();
        jdbc.query(
            "SELECT a.person_id, a.platform, a.external_key LIKE 'fbwall:%' AS wall, COUNT(*), MIN(m.timestamp), MAX(m.timestamp) " +
            "FROM chat_messages m JOIN chat_archives a ON a.id = m.chat_archive_id " +
            "WHERE a.person_id IS NOT NULL AND " + APPS + " AND " + MESSAGE + " GROUP BY 1, 2, 3",
            rs -> {
                UUID p = rs.getObject(1, UUID.class);
                String app = rs.getBoolean(3) ? "facebook-wall" : rs.getString(2).toLowerCase(Locale.ROOT);
                byApp.computeIfAbsent(p, k -> new LinkedHashMap<>()).merge(app, rs.getInt(4), Integer::sum);
                LocalDateTime from = local(rs.getTimestamp(5)), to = local(rs.getTimestamp(6));
                LocalDateTime[] s = span.computeIfAbsent(p, k -> new LocalDateTime[]{from, to});
                if (from.isBefore(s[0])) s[0] = from;
                if (to.isAfter(s[1])) s[1] = to;
            });
        List<Map<String, Object>> entries = new ArrayList<>();
        for (Person p : personRepo.findAllById(byApp.keySet())) {
            if (Boolean.TRUE.equals(p.getIsSelf()) || p.getRelationshipType() != Person.RelationshipType.ANGEL) continue;
            Map<String, Integer> apps = byApp.get(p.getId());
            int total = apps.values().stream().mapToInt(Integer::intValue).sum();
            Map<String, Object> metrics = new LinkedHashMap<>();
            metrics.put("messages", total);
            metrics.put("by_platform", apps);
            metrics.put("first", span.get(p.getId())[0].format(LOCAL));
            metrics.put("last", span.get(p.getId())[1].format(LOCAL));
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("id", p.getId());
            e.put("personId", p.getId());
            e.put("personName", p.getDisplayName() != null && !p.getDisplayName().isBlank() ? p.getDisplayName() : p.getName());
            e.put("label", p.getName());
            e.put("points", total);
            e.put("metrics", metrics);
            entries.add(e);
        }
        entries.sort(Comparator.comparing((Map<String, Object> e) -> -((Integer) e.get("points"))).thenComparing(e -> String.valueOf(e.get("label"))));
        for (int i = 0; i < entries.size(); i++) entries.get(i).put("rank", i + 1);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("title", "Tin nhắn Facebook, Yahoo, SMS, Zalo");
        out.put("series", SERIES);
        out.put("entries", entries);
        board = out;
        boardAt = System.currentTimeMillis();
        return out;
    }
}
