package com.sonic.angels.service;

import com.sonic.angels.model.dto.ForumDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/** Old forums saved from the web: threads and posts as they were, members (nicks) linked to people on the portal. */
@Service
@Transactional
public class ForumService {

    private final ForumRepository forumRepo;
    private final ForumThreadRepository threadRepo;
    private final ForumPostRepository postRepo;
    private final ForumMemberRepository memberRepo;
    private final PersonRepository personRepo;
    private final DtoMapper mapper;
    private final JdbcTemplate jdbc;

    public ForumService(ForumRepository forumRepo, ForumThreadRepository threadRepo, ForumPostRepository postRepo,
                        ForumMemberRepository memberRepo, PersonRepository personRepo, DtoMapper mapper, JdbcTemplate jdbc) {
        this.forumRepo = forumRepo; this.threadRepo = threadRepo; this.postRepo = postRepo; this.memberRepo = memberRepo;
        this.personRepo = personRepo; this.mapper = mapper; this.jdbc = jdbc;
    }

    // ── reading ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ForumDto.Summary> forums() {
        return forumRepo.findAll().stream().sorted(Comparator.comparing(Forum::getName)).map(this::summary).toList();
    }

    @Transactional(readOnly = true)
    public ForumDto.Summary forum(String key) { return summary(forumOf(key)); }

    private ForumDto.Summary summary(Forum f) {
        Map<String, Object> r = jdbc.queryForMap(
            "SELECT (SELECT count(*) FROM forum_threads WHERE forum_id = ?) AS threads, " +
            "(SELECT count(*) FROM forum_posts WHERE forum_id = ?) AS posts, " +
            "(SELECT count(*) FROM forum_members WHERE forum_id = ?) AS members, " +
            "(SELECT min(started_at) FROM forum_threads WHERE forum_id = ?) AS first, " +
            "(SELECT max(last_post_at) FROM forum_threads WHERE forum_id = ?) AS last", f.getId(), f.getId(), f.getId(), f.getId(), f.getId());
        return new ForumDto.Summary(f.getKey(), f.getName(), f.getUrl(), f.getDescription(), num(r.get("threads")), num(r.get("posts")),
            num(r.get("members")), time(r.get("first")), time(r.get("last")));
    }

    @Transactional(readOnly = true)
    public List<ForumDto.Board> boards(String key) {
        Forum f = forumOf(key);
        return jdbc.query("SELECT coalesce(board, '') AS board, count(*) AS threads, sum(post_count) AS posts, max(last_post_at) AS last " +
            "FROM forum_threads WHERE forum_id = ? GROUP BY coalesce(board, '') ORDER BY count(*) DESC, 1",
            (rs, i) -> new ForumDto.Board(rs.getString("board"), rs.getLong("threads"), rs.getLong("posts"), ts(rs, "last")), f.getId());
    }

    /** Threads of a forum, newest activity first; board narrows to a board and everything under it; q matches titles. */
    @Transactional(readOnly = true)
    public ForumDto.Page<ForumDto.ThreadSummary> threads(String key, String board, String q, String sort, int page, int size) {
        Forum f = forumOf(key);
        size = Math.max(1, Math.min(size, 200));
        StringBuilder where = new StringBuilder(" WHERE t.forum_id = ?");
        List<Object> args = new ArrayList<>(List.of(f.getId()));
        if (board != null && !board.isBlank()) { where.append(" AND (t.board = ? OR t.board LIKE ?)"); args.add(board); args.add(board + " / %"); }
        if (q != null && !q.isBlank()) { where.append(" AND t.title_fold LIKE ?"); args.add("%" + fold(q) + "%"); }
        String order = switch (sort == null ? "" : sort) {
            case "oldest" -> "t.started_at ASC";
            case "posts" -> "t.post_count DESC, t.last_post_at DESC";
            case "started" -> "t.started_at DESC";
            default -> "t.last_post_at DESC";
        };
        String from = " FROM (SELECT ft.*, " + FOLD_SQL.formatted("ft.title") + " AS title_fold FROM forum_threads ft) t";
        long total = num(jdbc.queryForObject("SELECT count(*)" + from + where, Object.class, args.toArray()));
        List<Object> pageArgs = new ArrayList<>(args); pageArgs.add(size); pageArgs.add((long) page * size);
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT t.id, t.title, t.board, t.started_at, t.last_post_at, t.post_count, t.starter_nick" +
            from + where + " ORDER BY " + order + " LIMIT ? OFFSET ?", pageArgs.toArray());
        List<UUID> ids = rows.stream().map(r -> (UUID) r.get("id")).toList();
        Map<UUID, List<UUID>> peopleOf = new HashMap<>();
        Map<UUID, UUID> starterOf = new HashMap<>();
        if (!ids.isEmpty()) {
            String in = ids.stream().map(x -> "?").collect(Collectors.joining(","));
            jdbc.query("SELECT thread_id, person_id, min(sort_order) AS first FROM forum_posts WHERE person_id IS NOT NULL AND thread_id IN (" + in + ") " +
                "GROUP BY thread_id, person_id ORDER BY thread_id, first", (org.springframework.jdbc.core.RowCallbackHandler) rs -> {
                    UUID t = (UUID) rs.getObject("thread_id"), p = (UUID) rs.getObject("person_id");
                    peopleOf.computeIfAbsent(t, k -> new ArrayList<>()).add(p);
                    if (rs.getInt("first") == 0) starterOf.put(t, p);
                }, ids.toArray());
        }
        Map<UUID, ForumDto.PersonRef> refs = refs(peopleOf.values().stream().flatMap(List::stream).collect(Collectors.toSet()));
        List<ForumDto.ThreadSummary> content = rows.stream().map(r -> {
            UUID id = (UUID) r.get("id");
            return new ForumDto.ThreadSummary(id, (String) r.get("title"), (String) r.get("board"), time(r.get("started_at")),
                time(r.get("last_post_at")), ((Number) r.get("post_count")).intValue(), (String) r.get("starter_nick"),
                refs.get(starterOf.get(id)), peopleOf.getOrDefault(id, List.of()).stream().map(refs::get).filter(Objects::nonNull).toList());
        }).toList();
        return new ForumDto.Page<>(content, total, page, size);
    }

    @Transactional(readOnly = true)
    public ForumDto.ThreadDetail thread(UUID id) {
        ForumThread t = threadRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Thread not found: " + id));
        List<ForumPost> posts = postRepo.findByThreadIdOrderBySortOrderAsc(id);
        Map<UUID, ForumDto.PersonRef> refs = refs(posts.stream().map(p -> p.getPerson() == null ? null : p.getPerson().getId())
            .filter(Objects::nonNull).collect(Collectors.toSet()));
        return new ForumDto.ThreadDetail(t.getId(), t.getForum().getKey(), t.getForum().getName(), t.getTitle(), t.getBoard(),
            t.getStartedAt(), t.getLastPostAt(), t.getPostCount(), t.getCaptured(),
            posts.stream().map(p -> new ForumDto.Post(p.getId(), p.getSortOrder(), p.getAuthorNick(),
                p.getPerson() == null ? null : refs.get(p.getPerson().getId()), p.getPostedAt(), p.getTitle(), p.getContentHtml())).toList());
    }

    /** Posts by words (accent-insensitive) and/or by a person, newest first. */
    @Transactional(readOnly = true)
    public ForumDto.Page<ForumDto.PostHit> posts(String key, String q, UUID personId, String nick, int page, int size) {
        size = Math.max(1, Math.min(size, 100));
        StringBuilder where = new StringBuilder(" WHERE 1=1");
        List<Object> args = new ArrayList<>();
        if (key != null) { where.append(" AND p.forum_id = ?"); args.add(forumOf(key).getId()); }
        String fq = q == null || q.isBlank() ? null : fold(q);
        if (fq != null) { where.append(" AND p.search_text LIKE ?"); args.add("%" + fq + "%"); }
        if (personId != null) { where.append(" AND p.person_id = ?"); args.add(personId); }
        if (nick != null && !nick.isBlank()) { where.append(" AND p.author_nick_lower = ?"); args.add(nick.toLowerCase()); }
        String from = " FROM forum_posts p JOIN forum_threads t ON t.id = p.thread_id JOIN forums f ON f.id = p.forum_id";
        long total = num(jdbc.queryForObject("SELECT count(*)" + from + where, Object.class, args.toArray()));
        List<Object> pageArgs = new ArrayList<>(args); pageArgs.add(size); pageArgs.add((long) page * size);
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT p.id, p.thread_id, t.title AS thread_title, f.forum_key, t.board, p.author_nick, " +
            "p.person_id, p.posted_at, p.title, p.content_text, p.search_text" + from + where + " ORDER BY p.posted_at DESC NULLS LAST LIMIT ? OFFSET ?", pageArgs.toArray());
        Map<UUID, ForumDto.PersonRef> refs = refs(rows.stream().map(r -> (UUID) r.get("person_id")).filter(Objects::nonNull).collect(Collectors.toSet()));
        return new ForumDto.Page<>(rows.stream().map(r -> new ForumDto.PostHit((UUID) r.get("id"), (UUID) r.get("thread_id"),
            (String) r.get("thread_title"), (String) r.get("forum_key"), (String) r.get("board"), (String) r.get("author_nick"),
            refs.get((UUID) r.get("person_id")), time(r.get("posted_at")), (String) r.get("title"),
            snippet((String) r.get("content_text"), (String) r.get("search_text"), fq))).toList(), total, page, size);
    }

    @Transactional(readOnly = true)
    public List<ForumDto.Member> members(String key) {
        Forum f = forumOf(key);
        Map<String, Long> counts = new HashMap<>();
        jdbc.query("SELECT author_nick_lower, count(*) AS n FROM forum_posts WHERE forum_id = ? GROUP BY author_nick_lower",
            (org.springframework.jdbc.core.RowCallbackHandler) rs -> counts.put(rs.getString(1), rs.getLong(2)), f.getId());
        List<ForumMember> ms = memberRepo.findByForumId(f.getId());
        Map<UUID, ForumDto.PersonRef> refs = refs(ms.stream().map(m -> m.getPerson() == null ? null : m.getPerson().getId())
            .filter(Objects::nonNull).collect(Collectors.toSet()));
        return ms.stream().map(m -> new ForumDto.Member(m.getId(), m.getNick(), m.getDisplayName(), m.getJoinedAt(), m.getIntro(), m.getAwards(),
                m.getTopicCount(), m.getReplyCount(), m.getPerson() == null ? null : refs.get(m.getPerson().getId()), counts.getOrDefault(m.getNickLower(), 0L)))
            .sorted(Comparator.comparingLong(ForumDto.Member::postCount).reversed().thenComparing(ForumDto.Member::nick, String.CASE_INSENSITIVE_ORDER))
            .toList();
    }

    /** The forum members who are this person (their nicks and member pages). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> personSummary(UUID personId) {
        return jdbc.queryForList("SELECT f.forum_key AS \"forumKey\", f.name AS \"forumName\", count(p.id) AS \"postCount\", " +
            "count(DISTINCT p.thread_id) AS \"threadCount\", min(p.posted_at) AS \"firstAt\", max(p.posted_at) AS \"lastAt\", " +
            "array_to_string(array_agg(DISTINCT p.author_nick), ', ') AS nicks FROM forum_posts p JOIN forums f ON f.id = p.forum_id " +
            "WHERE p.person_id = ? GROUP BY f.forum_key, f.name", personId);
    }

    // ── import ───────────────────────────────────────────────────────────────

    public ForumDto.Summary upsertForum(String key, ForumDto.ForumIn in) {
        if (key == null || !key.matches("[a-z0-9-]{1,40}")) throw new IllegalArgumentException("forum key: a-z, 0-9, -");
        Forum f = forumRepo.findByKey(key).orElseGet(() -> { Forum x = new Forum(); x.setKey(key); return x; });
        if (in.name() != null) f.setName(in.name());
        if (f.getName() == null) f.setName(key);
        if (in.url() != null) f.setUrl(in.url());
        if (in.description() != null) f.setDescription(in.description());
        return summary(forumRepo.save(f));
    }

    /** Members: who each nick is on the portal; posts by the nick follow. Fields not sent are kept. */
    public List<ForumDto.MemberResult> upsertMembers(String key, List<ForumDto.MemberIn> in) {
        Forum f = forumOf(key);
        Person self = personRepo.findByIsSelfTrue().orElse(null);
        List<ForumDto.MemberResult> out = new ArrayList<>();
        for (ForumDto.MemberIn m : in) {
            if (m.nick() == null || m.nick().isBlank()) continue;
            ForumMember fm = memberRepo.findByForumIdAndNickLower(f.getId(), m.nick().toLowerCase()).orElse(null);
            String action = fm == null ? "created" : "updated";
            if (fm == null) { fm = new ForumMember(); fm.setForum(f); fm.setNick(m.nick()); }
            String warning = null;
            Person p = null;
            if (Boolean.TRUE.equals(m.self())) p = self;
            else if (m.personSlug() != null) {
                p = personRepo.findBySlug(m.personSlug()).orElse(null);
                if (p == null) warning = "no person with slug " + m.personSlug();
            }
            if (p != null || Boolean.TRUE.equals(m.self()) || m.personSlug() != null) fm.setPerson(p);
            if (m.displayName() != null) fm.setDisplayName(m.displayName());
            if (m.joinedAt() != null) fm.setJoinedAt(m.joinedAt());
            if (m.intro() != null) fm.setIntro(m.intro());
            if (m.awards() != null) fm.setAwards(m.awards());
            if (m.topicCount() != null) fm.setTopicCount(m.topicCount());
            if (m.replyCount() != null) fm.setReplyCount(m.replyCount());
            fm = memberRepo.save(fm);
            UUID pid = fm.getPerson() == null ? null : fm.getPerson().getId();
            int linked = jdbc.update("UPDATE forum_posts SET person_id = ? WHERE forum_id = ? AND author_nick_lower = ? AND person_id IS DISTINCT FROM ?",
                pid, f.getId(), fm.getNickLower(), pid);
            out.add(new ForumDto.MemberResult(fm.getNick(), action, pid, fm.getPerson() == null ? null : fm.getPerson().getName(), linked, warning));
        }
        return out;
    }

    /** Threads, created or replaced as a whole (posts in the order sent); one sent again unchanged is left alone. */
    public List<ForumDto.ThreadResult> upsertThreads(String key, List<ForumDto.ThreadIn> in) {
        Forum f = forumOf(key);
        Map<String, Person> byNick = new HashMap<>();
        for (ForumMember m : memberRepo.findByForumId(f.getId())) if (m.getPerson() != null) byNick.put(m.getNickLower(), m.getPerson());
        List<ForumDto.ThreadResult> out = new ArrayList<>();
        for (ForumDto.ThreadIn t : in) {
            if (t.externalKey() == null || t.posts() == null || t.posts().isEmpty()) throw new IllegalArgumentException("thread needs externalKey and posts");
            String hash = hash(t);
            ForumThread th = threadRepo.findByForumIdAndExternalKey(f.getId(), t.externalKey()).orElse(null);
            if (th != null && hash.equals(th.getContentHash())) { out.add(new ForumDto.ThreadResult(t.externalKey(), th.getId(), "same", th.getPostCount())); continue; }
            String action = th == null ? "created" : "updated";
            if (th == null) { th = new ForumThread(); th.setForum(f); th.setExternalKey(t.externalKey()); }
            else { postRepo.deleteByThreadId(th.getId()); postRepo.flush(); }
            List<ForumDto.PostIn> ps = t.posts();
            th.setTitle(trim(t.title() != null && !t.title().isBlank() ? t.title() : ps.get(0).title(), 500));
            if (th.getTitle() == null) th.setTitle("(không tiêu đề)");
            th.setBoard(trim(t.board(), 300));
            th.setStarterNick(ps.get(0).authorNick());
            th.setStartedAt(ps.stream().map(ForumDto.PostIn::postedAt).filter(Objects::nonNull).min(Comparator.naturalOrder()).orElse(null));
            th.setLastPostAt(ps.stream().map(ForumDto.PostIn::postedAt).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null));
            th.setPostCount(ps.size());
            th.setSources(t.sources());
            th.setCaptured(t.captured());
            th.setContentHash(hash);
            th = threadRepo.save(th);
            int i = 0;
            List<ForumPost> rows = new ArrayList<>();
            for (ForumDto.PostIn p : ps) {
                ForumPost fp = new ForumPost();
                fp.setThread(th); fp.setForumId(f.getId()); fp.setSortOrder(i++);
                fp.setExternalId(p.externalId()); fp.setAuthorNick(p.authorNick() == null ? "?" : trim(p.authorNick(), 120));
                fp.setPerson(byNick.get(fp.getAuthorNickLower()));
                fp.setPostedAt(p.postedAt()); fp.setTitle(trim(p.title(), 500));
                fp.setContentHtml(p.contentHtml());
                String text = textOf(p.contentHtml());
                fp.setContentText(text);
                fp.setSearchText(fold((p.title() == null ? "" : p.title()) + " " + text));
                rows.add(fp);
            }
            postRepo.saveAll(rows);
            out.add(new ForumDto.ThreadResult(t.externalKey(), th.getId(), action, ps.size()));
        }
        return out;
    }

    public void deleteThread(UUID id) { threadRepo.deleteById(id); }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** Postgres side of fold(): lower case, đ → d, the Vietnamese marks taken off. */
    static final String FOLD_SQL = "translate(lower(%s), 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ', " +
        "'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd')";

    static String fold(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s.toLowerCase(Locale.ROOT).replace('đ', 'd'), Normalizer.Form.NFD);
        return n.replaceAll("\\p{M}+", "").replaceAll("\\s+", " ").trim();
    }

    static String textOf(String html) {
        if (html == null) return "";
        String t = html.replaceAll("(?i)<br\\s*/?>|</p>|</div>|</li>", "\n").replaceAll("<[^>]+>", " ");
        t = t.replace("&nbsp;", " ").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&#39;", "'").replace("&amp;", "&");
        return t.replaceAll("[ \\t\\x0B\\f\\r]+", " ").replaceAll(" *\n[ \n]*", "\n").trim();
    }

    private static String snippet(String text, String folded, String q) {
        if (text == null) return "";
        String flat = text.replace('\n', ' ');
        if (q == null || folded == null) return flat.length() > 220 ? flat.substring(0, 220) + "…" : flat;
        String ff = fold(flat);
        int i = ff.indexOf(q);
        if (i < 0) return flat.length() > 220 ? flat.substring(0, 220) + "…" : flat;
        int a = Math.max(0, i - 80), b = Math.min(flat.length(), i + q.length() + 140);
        return (a > 0 ? "…" : "") + flat.substring(a, b) + (b < flat.length() ? "…" : "");
    }

    private Map<UUID, ForumDto.PersonRef> refs(java.util.Collection<UUID> ids) {
        Map<UUID, ForumDto.PersonRef> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        for (Person p : personRepo.findAllById(ids)) {
            var s = mapper.toPersonSummary(p);
            out.put(p.getId(), new ForumDto.PersonRef(p.getId(), p.getName(), p.getDisplayName(), s.getAvatarUrl(), Boolean.TRUE.equals(p.getIsSelf())));
        }
        return out;
    }

    private Forum forumOf(String key) {
        return forumRepo.findByKey(key).orElseThrow(() -> new NoSuchElementException("Forum not found: " + key));
    }

    private static String hash(ForumDto.ThreadIn t) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            StringBuilder sb = new StringBuilder().append(t.title()).append('\u0001').append(t.board()).append('\u0001')
                .append(t.sources()).append('\u0001').append(t.captured());
            for (ForumDto.PostIn p : t.posts())
                sb.append('\u0002').append(p.externalId()).append('\u0001').append(p.authorNick()).append('\u0001').append(p.postedAt())
                  .append('\u0001').append(p.title()).append('\u0001').append(p.contentHtml());
            byte[] d = md.digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : d) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    private static String trim(String s, int n) { return s == null ? null : s.length() > n ? s.substring(0, n) : s; }
    private static long num(Object o) { return o == null ? 0 : ((Number) o).longValue(); }
    private static LocalDateTime time(Object o) { return o == null ? null : o instanceof Timestamp t ? t.toLocalDateTime() : (LocalDateTime) o; }
    private static LocalDateTime ts(ResultSet rs, String c) throws SQLException { Timestamp t = rs.getTimestamp(c); return t == null ? null : t.toLocalDateTime(); }
}
