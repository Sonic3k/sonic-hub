package com.sonic.angels.service;

import com.sonic.angels.model.dto.SocialDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import com.sonic.angels.util.SocialTime;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.MonthDay;
import java.util.*;
import java.util.Collection;
import java.util.stream.Collectors;

/**
 * The Social Media portal read at a moment T: who someone was then (name, picture), what stood on a timeline, which
 * comments and likes a post had by then, who was friends with whom. Nothing that happened after T shows.
 *
 * A View holds one moment and resolves profiles once per request (see Ref).
 */
@Service
@Transactional(readOnly = true)
public class SocialReadService {

    /** How long a post takes to reach the like / comment / share counts it showed (its declared counts). */
    private static final double RAMP_HOURS = 48;
    private static final int PREVIEW_COMMENTS = 3;
    private static final Set<SocialConnection.Kind> FRIEND = EnumSet.of(SocialConnection.Kind.FRIEND);
    private static final Set<SocialConnection.Kind> MEMBERSHIP = EnumSet.of(SocialConnection.Kind.MEMBER, SocialConnection.Kind.ADMIN, SocialConnection.Kind.MODERATOR);
    private static final Set<SocialConnection.Kind> FOLLOWING = EnumSet.of(SocialConnection.Kind.PAGE_LIKE, SocialConnection.Kind.FOLLOW);
    private static final UUID NONE = new UUID(0, 0);

    final SocialProfileRepository profileRepo;
    final SocialProfileNameRepository nameRepo;
    final SocialProfileImageRepository imageRepo;
    final SocialProfileDetailRepository detailRepo;
    final SocialAlbumRepository albumRepo;
    final SocialMediaItemRepository itemRepo;
    final SocialPostRepository postRepo;
    final SocialPostMediaRepository postMediaRepo;
    final SocialPostTagRepository tagRepo;
    final SocialCommentRepository commentRepo;
    final SocialReactionRepository reactionRepo;
    final SocialConnectionRepository connectionRepo;
    final ChatArchiveRepository archiveRepo;
    final ChatMessageRepository messageRepo;
    final StorageService storage;

    public SocialReadService(SocialProfileRepository profileRepo, SocialProfileNameRepository nameRepo,
                             SocialProfileImageRepository imageRepo, SocialProfileDetailRepository detailRepo,
                             SocialAlbumRepository albumRepo, SocialMediaItemRepository itemRepo,
                             SocialPostRepository postRepo, SocialPostMediaRepository postMediaRepo,
                             SocialPostTagRepository tagRepo, SocialCommentRepository commentRepo,
                             SocialReactionRepository reactionRepo, SocialConnectionRepository connectionRepo,
                             ChatArchiveRepository archiveRepo, ChatMessageRepository messageRepo, StorageService storage) {
        this.profileRepo = profileRepo;
        this.nameRepo = nameRepo;
        this.imageRepo = imageRepo;
        this.detailRepo = detailRepo;
        this.albumRepo = albumRepo;
        this.itemRepo = itemRepo;
        this.postRepo = postRepo;
        this.postMediaRepo = postMediaRepo;
        this.tagRepo = tagRepo;
        this.commentRepo = commentRepo;
        this.reactionRepo = reactionRepo;
        this.connectionRepo = connectionRepo;
        this.archiveRepo = archiveRepo;
        this.messageRepo = messageRepo;
        this.storage = storage;
    }

    // ════════════════════════════════════════════════════════════════════════
    // The moment
    // ════════════════════════════════════════════════════════════════════════

    /** The written ?at=, or the newest moment there is data for. */
    public LocalDateTime at(String at) {
        if (at != null && !at.isBlank()) {
            try {
                SocialTime.Moment m = SocialTime.parse(at);
                // a day or a month asked for is read at its end: everything of that day shows
                return m.precision().ordinal() <= DatePrecision.DAY.ordinal() ? m.precision().end(m.utc()).minusSeconds(1) : m.utc();
            } catch (IllegalArgumentException e) {
                throw new ImportException(400, "at: " + e.getMessage());
            }
        }
        LocalDateTime latest = range().latest();
        return latest != null ? latest : LocalDateTime.now(java.time.ZoneOffset.UTC);
    }

    public SocialDto.Range range() {
        Object[] p = postRepo.range().stream().findFirst().orElse(new Object[3]);
        LocalDateTime from = (LocalDateTime) p[0], to = (LocalDateTime) p[1];
        long posts = p[2] == null ? 0 : ((Number) p[2]).longValue();
        List<ChatArchive> threads = archiveRepo.messengerThreads();
        for (ChatArchive a : threads) {
            if (a.getDateFrom() != null && (from == null || a.getDateFrom().isBefore(from))) from = a.getDateFrom();
            if (a.getDateTo() != null && (to == null || a.getDateTo().isAfter(to))) to = a.getDateTo();
        }
        return new SocialDto.Range(from, to, to, posts, threads.size());
    }

    /** A random moment the portal has something at: a post's time or a message's, about evenly. */
    public SocialDto.Moment randomMoment() {
        Random rnd = new Random();
        List<ChatArchive> threads = archiveRepo.messengerThreads().stream().filter(a -> a.getMessageCount() != null && a.getMessageCount() > 0).toList();
        boolean usePost = threads.isEmpty() || rnd.nextBoolean();
        if (usePost) {
            List<Object> r = postRepo.randomMoment();
            if (!r.isEmpty() && r.get(0) != null) return new SocialDto.Moment(SocialTime.fromDb(r.get(0)), "post");
        }
        if (!threads.isEmpty()) {
            long total = threads.stream().mapToLong(ChatArchive::getMessageCount).sum();
            long pick = (long) (rnd.nextDouble() * total);
            for (ChatArchive a : threads) {
                if (pick < a.getMessageCount()) {
                    List<Object> r = messageRepo.timeAtOrAfter(a.getId(), (int) pick);
                    if (r.isEmpty()) r = messageRepo.timeAtOrAfter(a.getId(), 0);
                    if (!r.isEmpty()) return new SocialDto.Moment(SocialTime.fromDb(r.get(0)), "message");
                    break;
                }
                pick -= a.getMessageCount();
            }
        }
        List<Object> r = postRepo.randomMoment();
        return r.isEmpty() ? new SocialDto.Moment(null, null) : new SocialDto.Moment(SocialTime.fromDb(r.get(0)), "post");
    }

    // ════════════════════════════════════════════════════════════════════════
    // A view at one moment
    // ════════════════════════════════════════════════════════════════════════

    public View view(LocalDateTime t, SocialProfile.Platform platform) { return new View(t, platform); }

    /** One moment, and everything already worked out for it during this request. */
    public final class View {
        public final LocalDateTime t;
        public final SocialProfile me;
        private final Map<UUID, SocialDto.Ref> refs = new HashMap<>();
        private final Map<UUID, SocialProfile> profiles = new HashMap<>();
        private final Map<UUID, List<SocialProfileName>> names = new HashMap<>();
        private final Map<UUID, List<SocialProfileImage>> images = new HashMap<>();
        private Set<UUID> myFriends;

        View(LocalDateTime t, SocialProfile.Platform platform) {
            this.t = t;
            List<SocialProfile> self = profileRepo.findSelf(platform);
            this.me = self.isEmpty() ? null : self.get(0);
        }

        public UUID meId() { return me == null ? NONE : me.getId(); }

        /** Loads names and pictures of these profiles in two queries. */
        public void preload(Collection<SocialProfile> ps) {
            List<UUID> ids = new ArrayList<>();
            for (SocialProfile p : ps) {
                if (p == null) continue;
                profiles.putIfAbsent(p.getId(), p);
                if (!names.containsKey(p.getId())) ids.add(p.getId());
            }
            if (ids.isEmpty()) return;
            for (UUID id : ids) { names.put(id, new ArrayList<>()); images.put(id, new ArrayList<>()); }
            for (int i = 0; i < ids.size(); i += 1000) {
                List<UUID> chunk = ids.subList(i, Math.min(i + 1000, ids.size()));
                nameRepo.findByProfileIdIn(chunk).forEach(n -> names.get(n.getProfile().getId()).add(n));
                imageRepo.findByProfileIdIn(chunk).forEach(m -> images.get(m.getProfile().getId()).add(m));
            }
        }

        public SocialDto.Ref ref(SocialProfile p) {
            if (p == null) return null;
            SocialDto.Ref r = refs.get(p.getId());
            if (r != null) return r;
            preload(List.of(p));
            String state = state(p);
            boolean gone = "gone".equals(state);
            SocialProfileImage avatar = gone ? null : image(p, SocialProfileImage.Kind.AVATAR);
            Person.Gender g = p.getGender() != null ? p.getGender() : genderOfPerson(p);
            r = new SocialDto.Ref(p.getId(), p.getExternalKey(), gone ? null : p.getHandle(), p.getPlatform().name(), p.getKind().name(),
                state, gone ? platformUser(p) : nameAt(p), avatar == null ? null : url(avatar.getMediaFile()),
                g == null ? null : g.name(), Boolean.TRUE.equals(p.getVerified()));
            refs.put(p.getId(), r);
            return r;
        }

        public List<SocialDto.Ref> refs(Collection<SocialProfile> ps) {
            preload(ps);
            return ps.stream().map(this::ref).toList();
        }

        String state(SocialProfile p) {
            if (p.getClosedAt() != null && !t.isBefore(p.getClosedAt())) return "gone";
            if (p.getJoinedAt() != null && t.isBefore(p.getJoinedAt())) return "unborn";
            return p.isStub() ? "locked" : "active";
        }

        public String nameAt(SocialProfile p) {
            preload(List.of(p));
            SocialProfileName best = null;
            for (SocialProfileName n : names.getOrDefault(p.getId(), List.of())) {
                if (!covers(n.getValidFrom(), n.getValidTo())) continue;
                if (best == null || later(n.getValidFrom(), best.getValidFrom())) best = n;
            }
            return best != null ? best.getName() : p.getName();
        }

        /** The picture standing at T: the window that covers T and started last; else the default; else none. */
        public SocialProfileImage image(SocialProfile p, SocialProfileImage.Kind kind) {
            preload(List.of(p));
            SocialProfileImage best = null, dflt = null;
            for (SocialProfileImage m : images.getOrDefault(p.getId(), List.of())) {
                if (m.getKind() != kind) continue;
                if (m.isDefault()) { if (dflt == null) dflt = m; continue; }
                if (!covers(m.getValidFrom(), m.getValidTo())) continue;
                if (best == null || later(m.getValidFrom(), best.getValidFrom())) best = m;
            }
            return best != null ? best : dflt;
        }

        public List<SocialProfileImage> imagesOf(SocialProfile p) {
            preload(List.of(p));
            return images.getOrDefault(p.getId(), List.of());
        }

        boolean covers(LocalDateTime from, LocalDateTime to) {
            return (from == null || !from.isAfter(t)) && (to == null || to.isAfter(t));
        }

        public Set<UUID> myFriends() {
            if (myFriends == null) myFriends = me == null ? Set.of() : friendIds(me.getId(), t);
            return myFriends;
        }
    }

    private static boolean later(LocalDateTime a, LocalDateTime b) {
        if (a == null) return false;
        return b == null || a.isAfter(b);
    }

    private static String platformUser(SocialProfile p) {
        return switch (p.getPlatform()) {
            case FACEBOOK -> "Facebook user";
            case INSTAGRAM -> "Instagram user";
            case THREADS -> "Threads user";
            case YAHOO -> "Yahoo user";
            case SKYPE -> "Skype user";
            case ZALO -> "Zalo user";
            case SMS -> "Unknown";
        };
    }

    private static Person.Gender genderOfPerson(SocialProfile p) {
        try { return p.getPerson() == null ? null : p.getPerson().getGender(); }
        catch (RuntimeException e) { return null; }
    }

    String url(MediaFile m) {
        if (m == null) return null;
        if (m.getPosterStorageKey() != null && m.getFileType() != MediaFile.FileType.IMAGE && m.getFileType() != MediaFile.FileType.VIDEO)
            return storage.buildCdnUrl(m.getPosterStorageKey());
        return storage.buildCdnUrl(m.getStorageKey(), m.getStorageProvider());
    }

    // ════════════════════════════════════════════════════════════════════════
    // Finding a profile
    // ════════════════════════════════════════════════════════════════════════

    /** By id, by handle (on the platform), or by key. */
    public SocialProfile find(String ref, SocialProfile.Platform platform) {
        if (ref == null || ref.isBlank()) throw new ImportException(404, "no profile");
        String r = ref.trim();
        try {
            Optional<SocialProfile> byId = profileRepo.findById(UUID.fromString(r));
            if (byId.isPresent()) return byId.get();
        } catch (IllegalArgumentException ignored) { /* not an id */ }
        return profileRepo.findByPlatformAndHandle(platform, r)
            .or(() -> profileRepo.findByExternalKey(r))
            .orElseThrow(() -> new ImportException(404, "no profile " + r));
    }

    // ════════════════════════════════════════════════════════════════════════
    // Connections at T
    // ════════════════════════════════════════════════════════════════════════

    Set<UUID> friendIds(UUID pid, LocalDateTime t) {
        Set<UUID> out = new HashSet<>();
        for (SocialConnection c : connectionRepo.touching(pid, FRIEND, t))
            out.add(c.getFrom().getId().equals(pid) ? c.getTo().getId() : c.getFrom().getId());
        return out;
    }

    /** Friends at T with the time each friendship began. */
    private Map<SocialProfile, LocalDateTime> friendsOf(UUID pid, LocalDateTime t) {
        Map<SocialProfile, LocalDateTime> out = new LinkedHashMap<>();
        for (SocialConnection c : connectionRepo.touching(pid, FRIEND, t)) {
            SocialProfile other = c.getFrom().getId().equals(pid) ? c.getTo() : c.getFrom();
            LocalDateTime since = c.getValidFrom();
            if (!out.containsKey(other)) out.put(other, since);
            else if (since != null && (out.get(other) == null || since.isBefore(out.get(other)))) out.put(other, since);
        }
        return out;
    }

    // ════════════════════════════════════════════════════════════════════════
    // Profiles
    // ════════════════════════════════════════════════════════════════════════

    public SocialDto.Profile profile(String ref, LocalDateTime t) {
        SocialProfile p = find(ref, SocialProfile.Platform.FACEBOOK);
        View v = view(t, p.getPlatform());
        SocialDto.Ref r = v.ref(p);
        if (!"active".equals(r.state()))
            return new SocialDto.Profile(r, null, null, null, null, null, null, null, p.getLevel().name(),
                List.of(), new SocialDto.Counts(0, 0, 0, 0, 0, 0), withMe(v, p), List.of(), List.of(), t);

        SocialProfileImage cover = v.image(p, SocialProfileImage.Kind.COVER);
        List<SocialDto.Detail> intro = details(v, p);
        Map<SocialProfile, LocalDateTime> friends = p.getKind() == SocialProfile.Kind.USER ? friendsOf(p.getId(), t) : Map.of();
        Set<UUID> mine = v.myFriends();
        boolean isMe = v.me != null && v.me.getId().equals(p.getId());
        int mutual = isMe ? 0 : (int) friends.keySet().stream().filter(f -> mine.contains(f.getId())).count();
        int members = p.getKind() == SocialProfile.Kind.GROUP ? connectionRepo.to(p.getId(), MEMBERSHIP, t).stream().map(c -> c.getFrom().getId()).collect(Collectors.toSet()).size() : 0;
        int likes = p.getKind() == SocialProfile.Kind.PAGE ? connectionRepo.to(p.getId(), FOLLOWING, t).size() : 0;
        int declared = p.getDeclaredCount() == null ? 0 : p.getDeclaredCount();
        int photos = (int) postMediaRepo.countUploadsOf(p.getId(), v.meId(), t);
        int notes = postRepo.notes(p.getId(), v.meId(), t, false, t, NONE, PageRequest.of(0, 100)).size();
        SocialDto.Counts counts = new SocialDto.Counts(Math.max(friends.size(), p.getKind() == SocialProfile.Kind.USER ? declared : 0), mutual, photos,
            Math.max(members, p.getKind() == SocialProfile.Kind.GROUP ? declared : 0), Math.max(likes, p.getKind() == SocialProfile.Kind.PAGE ? declared : 0), notes);

        List<SocialDto.Media> photoPreview = media(postMediaRepo.uploadsOf(p.getId(), v.meId(), t, PageRequest.of(0, 9)));
        List<SocialProfile> friendPreview = friends.entrySet().stream()
            .sorted(Comparator.<Map.Entry<SocialProfile, LocalDateTime>, Boolean>comparing(e -> !isMe && !mine.contains(e.getKey().getId()))
                .thenComparing(e -> e.getValue(), Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(9).map(Map.Entry::getKey).toList();
        return new SocialDto.Profile(r, cover == null ? null : url(cover.getMediaFile()),
            cover == null ? null : cover.getFocusX(), cover == null ? null : cover.getFocusY(), r.avatarUrl(),
            p.getPrivacy() == null ? null : p.getPrivacy().name(), p.getCategory(), p.getJoinedAt(), p.getLevel().name(),
            intro, counts, withMe(v, p), photoPreview, v.refs(friendPreview), t);
    }

    private SocialDto.Friendship withMe(View v, SocialProfile p) {
        if (v.me == null) return new SocialDto.Friendship(false, null, false);
        if (v.me.getId().equals(p.getId())) return new SocialDto.Friendship(false, null, true);
        LocalDateTime since = null;
        boolean friends = false;
        for (SocialConnection c : connectionRepo.touching(p.getId(), FRIEND, v.t)) {
            UUID other = c.getFrom().getId().equals(p.getId()) ? c.getTo().getId() : c.getFrom().getId();
            if (other.equals(v.me.getId())) { friends = true; since = c.getValidFrom(); }
        }
        return new SocialDto.Friendship(friends, since, false);
    }

    /** The intro / about lines standing at T. A line with no window of its own shows from the fact's start; of the
     *  one-value kinds (city, relationship, bio…) only the newest shows. */
    private List<SocialDto.Detail> details(View v, SocialProfile p) {
        Set<SocialProfileDetail.Kind> single = EnumSet.of(SocialProfileDetail.Kind.BIO, SocialProfileDetail.Kind.CURRENT_CITY,
            SocialProfileDetail.Kind.HOMETOWN, SocialProfileDetail.Kind.RELATIONSHIP, SocialProfileDetail.Kind.BIRTHDAY,
            SocialProfileDetail.Kind.ABOUT, SocialProfileDetail.Kind.INTERESTED_IN, SocialProfileDetail.Kind.NICKNAME);
        LocalDate today = SocialTime.vnDay(v.t);
        List<SocialProfileDetail> shown = new ArrayList<>();
        Map<SocialProfileDetail.Kind, SocialProfileDetail> newest = new EnumMap<>(SocialProfileDetail.Kind.class);
        for (SocialProfileDetail d : detailRepo.findByProfileId(p.getId())) {
            LocalDateTime from = shownFrom(d);
            if (!v.covers(from, d.getValidTo())) continue;
            if (single.contains(d.getKind())) {
                SocialProfileDetail had = newest.get(d.getKind());
                if (had == null || later(from, shownFrom(had))) newest.put(d.getKind(), d);
            } else shown.add(d);
        }
        shown.addAll(newest.values());
        v.preload(shown.stream().map(SocialProfileDetail::getRelated).filter(Objects::nonNull).toList());
        return shown.stream()
            .sorted(Comparator.comparing((SocialProfileDetail d) -> d.getKind().ordinal())
                .thenComparing(SocialProfileDetail::getSortOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(SocialProfileDetail::getStartDate, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(d -> new SocialDto.Detail(d.getId(), d.getKind().name(), d.getTitle(), d.getSubtitle(), d.getBody(),
                v.ref(d.getRelated()), d.getStartDate(), d.getEndDate(),
                d.getDatePrecision() == null ? null : d.getDatePrecision().name(), stillTrue(d, today)))
            .toList();
    }

    /** Whether the fact still held on that day: "2008–2013" at year precision runs to the end of 2013. */
    private static boolean stillTrue(SocialProfileDetail d, LocalDate today) {
        if (d.getEndDate() == null) return true;
        DatePrecision p = d.getDatePrecision() == null ? DatePrecision.DAY : d.getDatePrecision();
        LocalDate end = p.end(p.floor(d.getEndDate().atStartOfDay())).toLocalDate();
        return today.isBefore(end);
    }

    /** When an intro line went up: its own window, else the start of the fact (Vietnam midnight), else always. */
    private static LocalDateTime shownFrom(SocialProfileDetail d) {
        if (d.getValidFrom() != null) return d.getValidFrom();
        if (d.getStartDate() == null) return null;
        return d.getStartDate().atStartOfDay(SocialTime.VN).withZoneSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime();
    }

    // ── Timelines ────────────────────────────────────────────────────────────

    public SocialDto.PostPage timeline(String ref, LocalDateTime t, String before, int size) {
        SocialProfile p = find(ref, SocialProfile.Platform.FACEBOOK);
        View v = view(t, p.getPlatform());
        if (!"active".equals(v.state(p))) return new SocialDto.PostPage(List.of(), null);
        Cursor c = Cursor.of(before);
        int n = clamp(size, 10, 50);
        List<SocialPost> pinned = c.has ? List.of() : postRepo.pinned(p.getId(), t).stream().limit(1).toList();
        List<SocialPost> rows = new ArrayList<>(postRepo.timeline(p.getId(), v.meId(), t, c.has, c.at, c.id, PageRequest.of(0, n + 1)));
        String next = nextOf(rows, n);
        Set<UUID> pinIds = pinned.stream().map(SocialPost::getId).collect(Collectors.toSet());
        rows.removeIf(x -> pinIds.contains(x.getId()));
        List<SocialPost> page = new ArrayList<>(pinned);
        page.addAll(rows);
        return new SocialDto.PostPage(posts(v, page, false), next);
    }

    public SocialDto.PostPage notes(String ref, LocalDateTime t, String before, int size) {
        SocialProfile p = find(ref, SocialProfile.Platform.FACEBOOK);
        View v = view(t, p.getPlatform());
        if (!"active".equals(v.state(p))) return new SocialDto.PostPage(List.of(), null);
        Cursor c = Cursor.of(before);
        int n = clamp(size, 10, 50);
        List<SocialPost> rows = new ArrayList<>(postRepo.notes(p.getId(), v.meId(), t, c.has, c.at, c.id, PageRequest.of(0, n + 1)));
        String next = nextOf(rows, n);
        return new SocialDto.PostPage(posts(v, rows, false), next);
    }

    /** The news feed of the owner at T: friends, the groups they were in, the pages they liked, and their own posts. */
    public SocialDto.PostPage feed(LocalDateTime t, String before, int size) {
        View v = view(t, SocialProfile.Platform.FACEBOOK);
        Cursor c = Cursor.of(before);
        int n = clamp(size, 10, 50);
        List<SocialPost> rows;
        if (v.me == null) rows = postRepo.everything(t, c.has, c.at, c.id, PageRequest.of(0, n + 1));
        else {
            Set<UUID> authors = new HashSet<>(v.myFriends());
            authors.add(v.me.getId());
            Set<UUID> walls = new HashSet<>(authors);
            for (SocialConnection x : connectionRepo.from(v.me.getId(), MEMBERSHIP, t)) walls.add(x.getTo().getId());
            for (SocialConnection x : connectionRepo.from(v.me.getId(), FOLLOWING, t)) { walls.add(x.getTo().getId()); authors.add(x.getTo().getId()); }
            rows = postRepo.feed(authors, walls, v.meId(), t, c.has, c.at, c.id, PageRequest.of(0, n + 1));
        }
        rows = new ArrayList<>(rows);
        String next = nextOf(rows, n);
        return new SocialDto.PostPage(posts(v, rows, false), next);
    }

    public SocialDto.Post post(String ref, LocalDateTime t) {
        SocialPost p = findPost(ref);
        View v = view(t, p.getWall().getPlatform());
        if (p.getPostedAt().isAfter(t)) throw new ImportException(404, "not posted yet at that moment");
        if (p.getAudience() == SocialPost.Audience.ONLY_ME && !p.getAuthor().getId().equals(v.meId()))
            throw new ImportException(404, "only its author can see it");
        return posts(v, List.of(p), true).get(0);
    }

    private SocialPost findPost(String ref) {
        String r = ref == null ? "" : ref.trim();
        try {
            Optional<SocialPost> byId = postRepo.findById(UUID.fromString(r));
            if (byId.isPresent()) return byId.get();
        } catch (IllegalArgumentException ignored) { /* a key */ }
        return postRepo.findByExternalKey(r).orElseThrow(() -> new ImportException(404, "no post " + r));
    }

    public SocialDto.FriendshipPage friendship(String a, String b, LocalDateTime t, String before, int size) {
        SocialProfile pa = find(a, SocialProfile.Platform.FACEBOOK), pb = find(b, SocialProfile.Platform.FACEBOOK);
        View v = view(t, pa.getPlatform());
        LocalDateTime since = null;
        for (SocialConnection c : connectionRepo.touching(pa.getId(), FRIEND, t))
            if (c.getFrom().getId().equals(pb.getId()) || c.getTo().getId().equals(pb.getId())) since = c.getValidFrom() != null ? c.getValidFrom() : since;
        Set<UUID> fb = friendIds(pb.getId(), t);
        List<SocialProfile> mutual = friendsOf(pa.getId(), t).keySet().stream().filter(x -> fb.contains(x.getId())).limit(12).toList();
        Cursor c = Cursor.of(before);
        int n = clamp(size, 10, 50);
        List<SocialPost> rows = new ArrayList<>(postRepo.between(pa.getId(), pb.getId(), v.meId(), t, c.has, c.at, c.id, PageRequest.of(0, n + 1)));
        String next = nextOf(rows, n);
        return new SocialDto.FriendshipPage(v.ref(pa), v.ref(pb), since, v.refs(mutual), posts(v, rows, false), next);
    }

    // ── Friends, members, photos ─────────────────────────────────────────────

    public List<SocialDto.FriendRow> friends(String ref, LocalDateTime t, String q) {
        SocialProfile p = find(ref, SocialProfile.Platform.FACEBOOK);
        View v = view(t, p.getPlatform());
        if (!"active".equals(v.state(p))) return List.of();
        Map<SocialProfile, LocalDateTime> rows = new LinkedHashMap<>();
        if (p.getKind() == SocialProfile.Kind.GROUP)
            connectionRepo.to(p.getId(), MEMBERSHIP, t).forEach(c -> rows.putIfAbsent(c.getFrom(), c.getValidFrom()));
        else if (p.getKind() == SocialProfile.Kind.PAGE)
            connectionRepo.to(p.getId(), FOLLOWING, t).forEach(c -> rows.putIfAbsent(c.getFrom(), c.getValidFrom()));
        else rows.putAll(friendsOf(p.getId(), t));
        v.preload(rows.keySet());
        String needle = fold(q);
        Set<UUID> mine = v.myFriends();
        return rows.entrySet().stream()
            .map(e -> new SocialDto.FriendRow(v.ref(e.getKey()), e.getValue(), mine.contains(e.getKey().getId())))
            .filter(r -> needle.isEmpty() || fold(r.ref().name()).contains(needle))
            .sorted(Comparator.comparing((SocialDto.FriendRow r) -> !r.mutual()).thenComparing(r -> fold(r.ref().name())))
            .toList();
    }

    public SocialDto.Photos photos(String ref, LocalDateTime t) {
        SocialProfile p = find(ref, SocialProfile.Platform.FACEBOOK);
        View v = view(t, p.getPlatform());
        if (!"active".equals(v.state(p))) return new SocialDto.Photos(List.of(), List.of(), List.of());
        List<SocialDto.AlbumRow> albums = new ArrayList<>();
        for (SocialProfileImage.Kind k : SocialProfileImage.Kind.values()) {
            List<SocialProfileImage> shown = pictureHistory(v, p, k);
            if (shown.isEmpty()) continue;
            SocialProfileImage current = v.image(p, k);
            albums.add(new SocialDto.AlbumRow(k == SocialProfileImage.Kind.AVATAR ? "avatars" : "covers", null,
                k == SocialProfileImage.Kind.AVATAR ? "Profile Pictures" : "Cover Photos", null,
                url((current != null ? current : shown.get(0)).getMediaFile()), shown.size(),
                shown.get(0).getValidFrom(), "derived"));
        }
        List<SocialPostMedia> loose = postMediaRepo.looseOf(p.getId(), v.meId(), t);
        if (!loose.isEmpty())
            albums.add(new SocialDto.AlbumRow("timeline", null, "Timeline Photos", null, url(loose.get(loose.size() - 1).getMediaFile()),
                loose.size(), loose.get(loose.size() - 1).getPost().getPostedAt(), "derived"));
        List<SocialAlbum> own = albumRepo.findByProfileId(p.getId()).stream()
            .filter(a -> a.getPublishedAt() == null || !a.getPublishedAt().isAfter(t)).toList();
        if (!own.isEmpty()) {
            Map<UUID, Object[]> stats = new HashMap<>();
            for (Object[] r : postMediaRepo.albumStats(own.stream().map(SocialAlbum::getId).toList(), v.meId(), t)) stats.put((UUID) r[0], r);
            // an album without a cover of its own shows its first photo: found for all such albums together
            List<UUID> coverless = own.stream().filter(a -> a.getCover() == null && stats.containsKey(a.getId())).map(SocialAlbum::getId).toList();
            Map<UUID, MediaFile> first = new HashMap<>();
            if (!coverless.isEmpty())
                for (Object[] r : postMediaRepo.firstOfAlbums(coverless, v.meId(), t)) first.putIfAbsent((UUID) r[0], ((SocialPostMedia) r[1]).getMediaFile());
            for (SocialAlbum a : own) {
                Object[] s = stats.get(a.getId());
                int count = s == null ? 0 : ((Number) s[1]).intValue();
                if (count == 0 && a.getPublishedAt() == null) continue;
                String cover = a.getCover() != null ? url(a.getCover()) : count == 0 || first.get(a.getId()) == null ? null : url(first.get(a.getId()));
                albums.add(new SocialDto.AlbumRow(a.getId().toString(), a.getExternalKey(), a.getTitle(), a.getDescription(), cover, count,
                    s == null ? a.getPublishedAt() : (LocalDateTime) s[2], "album"));
            }
        }
        return new SocialDto.Photos(albums,
            media(postMediaRepo.uploadsOf(p.getId(), v.meId(), t, PageRequest.of(0, 60))),
            media(postMediaRepo.taggedOf(p.getId(), v.meId(), t, PageRequest.of(0, 60))));
    }

    /** The profile pictures (or covers) a profile had put up by T, newest first; the default only when none was. */
    private List<SocialProfileImage> pictureHistory(View v, SocialProfile p, SocialProfileImage.Kind k) {
        List<SocialProfileImage> all = v.imagesOf(p).stream().filter(i -> i.getKind() == k).toList();
        List<SocialProfileImage> dated = all.stream().filter(i -> !i.isDefault() && i.getValidFrom() != null && !i.getValidFrom().isAfter(v.t))
            .sorted(Comparator.comparing(SocialProfileImage::getValidFrom).reversed()).toList();
        if (!dated.isEmpty()) return dated;
        SocialProfileImage now = v.image(p, k);
        return now == null ? List.of() : List.of(now);
    }

    public SocialDto.AlbumPage album(String ref, String albumId, LocalDateTime t) {
        SocialProfile p = find(ref, SocialProfile.Platform.FACEBOOK);
        View v = view(t, p.getPlatform());
        if (!"active".equals(v.state(p))) throw new ImportException(404, "this profile is not available");
        switch (albumId) {
            case "avatars", "covers" -> {
                SocialProfileImage.Kind k = "avatars".equals(albumId) ? SocialProfileImage.Kind.AVATAR : SocialProfileImage.Kind.COVER;
                List<SocialProfileImage> shown = pictureHistory(v, p, k);
                List<UUID> fileIds = shown.stream().map(i -> i.getMediaFile().getId()).toList();
                Map<UUID, String> keys = keysOf(fileIds);
                List<SocialDto.Media> media = shown.stream().map(i -> mediaOf(i.getMediaFile(), keys, null,
                    i.getPost() == null ? null : i.getPost().getText())).toList();
                return new SocialDto.AlbumPage(new SocialDto.AlbumRow(albumId, null, k == SocialProfileImage.Kind.AVATAR ? "Profile Pictures" : "Cover Photos",
                    null, media.isEmpty() ? null : media.get(0).url(), media.size(), shown.isEmpty() ? null : shown.get(0).getValidFrom(), "derived"), v.ref(p), media);
            }
            case "timeline" -> {
                List<SocialDto.Media> media = media(postMediaRepo.looseOf(p.getId(), v.meId(), t));
                return new SocialDto.AlbumPage(new SocialDto.AlbumRow("timeline", null, "Timeline Photos", null,
                    media.isEmpty() ? null : media.get(media.size() - 1).url(), media.size(), null, "derived"), v.ref(p), media);
            }
            default -> {
                SocialAlbum a;
                try { a = albumRepo.findById(UUID.fromString(albumId)).orElse(null); }
                catch (IllegalArgumentException e) { a = albumRepo.findByExternalKey(albumId).orElse(null); }
                if (a == null || !a.getProfile().getId().equals(p.getId())) throw new ImportException(404, "no album " + albumId);
                if (a.getPublishedAt() != null && a.getPublishedAt().isAfter(t)) throw new ImportException(404, "the album was not made yet");
                List<SocialDto.Media> media = media(postMediaRepo.ofAlbum(a.getId(), v.meId(), t));
                return new SocialDto.AlbumPage(new SocialDto.AlbumRow(a.getId().toString(), a.getExternalKey(), a.getTitle(), a.getDescription(),
                    a.getCover() != null ? url(a.getCover()) : media.isEmpty() ? null : media.get(0).url(), media.size(), a.getPublishedAt(), "album"),
                    v.ref(p), media);
            }
        }
    }

    // ── Home, search ─────────────────────────────────────────────────────────

    public SocialDto.Home home(LocalDateTime t) {
        View v = view(t, SocialProfile.Platform.FACEBOOK);
        if (v.me == null) return new SocialDto.Home(null, List.of(), List.of(), List.of(), t);
        List<SocialProfile> groups = connectionRepo.from(v.me.getId(), MEMBERSHIP, t).stream().map(SocialConnection::getTo)
            .filter(g -> g.getKind() == SocialProfile.Kind.GROUP).distinct().toList();
        List<SocialProfile> pages = connectionRepo.from(v.me.getId(), FOLLOWING, t).stream().map(SocialConnection::getTo)
            .filter(g -> g.getKind() == SocialProfile.Kind.PAGE).distinct().toList();
        MonthDay today = MonthDay.from(SocialTime.vnDay(t));
        Set<UUID> friendIds = v.myFriends();
        List<SocialProfile> born = new ArrayList<>();
        if (!friendIds.isEmpty()) {
            List<SocialProfile> friends = profileRepo.findWithPersonByIdIn(friendIds);
            Map<UUID, LocalDate> fromDetails = new HashMap<>();
            for (SocialProfileDetail d : detailRepo.findByProfileIdInAndKind(friendIds, SocialProfileDetail.Kind.BIRTHDAY))
                if (d.getStartDate() != null && d.getDatePrecision() != DatePrecision.YEAR) fromDetails.put(d.getProfile().getId(), d.getStartDate());
            for (SocialProfile f : friends) {
                LocalDate d = fromDetails.get(f.getId());
                MonthDay md = d != null ? MonthDay.from(d) : birthdayOfPerson(f.getPerson());
                if (today.equals(md)) born.add(f);
            }
        }
        return new SocialDto.Home(v.ref(v.me), v.refs(groups), v.refs(pages), v.refs(born), t);
    }

    private static MonthDay birthdayOfPerson(Person p) {
        if (p == null) return null;
        if (p.getDateOfBirth() != null) return MonthDay.from(p.getDateOfBirth());
        if (p.getBirthDay() != null && p.getBirthMonth() != null) {
            try { return MonthDay.of(p.getBirthMonth(), p.getBirthDay()); } catch (RuntimeException e) { return null; }
        }
        return null;
    }

    /** People, pages and groups by any name they went by, shown as they were at T. */
    public List<SocialDto.Ref> search(String q, LocalDateTime t, int limit) {
        String needle = fold(q);
        if (needle.length() < 2) return List.of();
        Set<UUID> hits = new LinkedHashSet<>();
        for (Object[] r : profileRepo.namesOf(SocialProfile.Platform.FACEBOOK)) if (fold((String) r[1]).contains(needle)) hits.add((UUID) r[0]);
        for (Object[] r : nameRepo.namesOf(SocialProfile.Platform.FACEBOOK)) if (fold((String) r[1]).contains(needle)) hits.add((UUID) r[0]);
        if (hits.isEmpty()) return List.of();
        View v = view(t, SocialProfile.Platform.FACEBOOK);
        List<SocialProfile> ps = profileRepo.findAllById(hits).stream().filter(p -> p.getKind() != SocialProfile.Kind.CHAT).toList();
        Set<UUID> mine = v.myFriends();
        return v.refs(ps).stream()
            .filter(r -> !"unborn".equals(r.state()) && !"gone".equals(r.state()))
            .sorted(Comparator.comparing((SocialDto.Ref r) -> "locked".equals(r.state()))
                .thenComparing(r -> !mine.contains(r.id()))
                .thenComparing(r -> !fold(r.name()).startsWith(needle))
                .thenComparing(r -> fold(r.name())))
            .limit(clamp(limit, 8, 50)).toList();
    }

    /** Lower case without Vietnamese marks, so "huyen dieu" finds "Huyền Diệu". */
    static String fold(String s) {
        if (s == null) return "";
        String x = s.replace('đ', 'd').replace('Đ', 'D');
        return Normalizer.normalize(x, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).trim();
    }

    // ════════════════════════════════════════════════════════════════════════
    // Posts as they read at T
    // ════════════════════════════════════════════════════════════════════════

    /** Posts with their photos, tags, comments and likes as of T. full = one post on its own page: every comment and
     *  the body of a note; otherwise the last few comments and a note's opening. */
    List<SocialDto.Post> posts(View v, List<SocialPost> posts, boolean full) {
        if (posts.isEmpty()) return List.of();
        List<SocialPost> all = new ArrayList<>(posts);
        Set<UUID> sharedIds = new HashSet<>();
        posts.forEach(p -> {
            if (p.getSharedPost() != null && !p.getSharedPost().getPostedAt().isAfter(v.t)) { all.add(p.getSharedPost()); sharedIds.add(p.getSharedPost().getId()); }
        });
        List<UUID> ids = all.stream().map(SocialPost::getId).distinct().toList();

        Map<UUID, List<SocialPostMedia>> media = postMediaRepo.findByPostIdIn(ids).stream().collect(Collectors.groupingBy(m -> m.getPost().getId()));
        Map<UUID, List<SocialPostTag>> tags = tagRepo.findByPostIdIn(ids).stream().collect(Collectors.groupingBy(x -> x.getPost().getId()));
        List<SocialComment> comments = commentRepo.visibleOn(ids, v.t);
        Map<UUID, List<SocialReaction>> postReactions = reactionRepo.onPosts(ids, v.t).stream().collect(Collectors.groupingBy(r -> r.getPost().getId()));
        Map<UUID, List<SocialReaction>> commentReactions = comments.isEmpty() ? Map.of()
            : reactionRepo.onComments(comments.stream().map(SocialComment::getId).toList(), v.t).stream().collect(Collectors.groupingBy(r -> r.getComment().getId()));
        Set<UUID> fileIds = new HashSet<>();
        media.values().forEach(l -> l.forEach(m -> fileIds.add(m.getMediaFile().getId())));
        comments.forEach(c -> { if (c.getMediaFile() != null) fileIds.add(c.getMediaFile().getId()); });
        Map<UUID, String> keys = keysOf(fileIds);

        Set<SocialProfile> people = new HashSet<>();
        all.forEach(p -> { people.add(p.getAuthor()); people.add(p.getWall()); if (p.getPlace() != null) people.add(p.getPlace()); });
        tags.values().forEach(l -> l.forEach(x -> people.add(x.getProfile())));
        comments.forEach(c -> people.add(c.getAuthor()));
        postReactions.values().forEach(l -> l.forEach(r -> people.add(r.getProfile())));
        commentReactions.values().forEach(l -> l.forEach(r -> people.add(r.getProfile())));
        v.preload(people);

        Map<UUID, List<SocialComment>> byPost = comments.stream().collect(Collectors.groupingBy(c -> c.getPost().getId(), LinkedHashMap::new, Collectors.toList()));
        Map<UUID, SocialDto.Post> sharedOut = new HashMap<>();
        for (SocialPost p : all)
            if (sharedIds.contains(p.getId()) && !sharedOut.containsKey(p.getId()))
                sharedOut.put(p.getId(), post(v, p, null, media, tags, Map.of(), postReactions, commentReactions, keys, false, false));
        List<SocialDto.Post> out = new ArrayList<>();
        for (SocialPost p : posts) {
            SocialDto.Post shared = p.getSharedPost() == null ? null : sharedOut.get(p.getSharedPost().getId());
            out.add(post(v, p, shared, media, tags, byPost, postReactions, commentReactions, keys, full, true));
        }
        return out;
    }

    private SocialDto.Post post(View v, SocialPost p, SocialDto.Post shared, Map<UUID, List<SocialPostMedia>> media,
                                Map<UUID, List<SocialPostTag>> tags, Map<UUID, List<SocialComment>> byPost,
                                Map<UUID, List<SocialReaction>> postReactions, Map<UUID, List<SocialReaction>> commentReactions,
                                Map<UUID, String> keys, boolean full, boolean withComments) {
        List<SocialPostMedia> pm = media.getOrDefault(p.getId(), List.of());
        List<SocialDto.Media> mediaOut = pm.stream().map(m -> mediaOf(m.getMediaFile(), keys, m.getId(), m.getCaption())).toList();
        List<SocialDto.Ref> tagged = tags.getOrDefault(p.getId(), List.of()).stream().map(x -> v.ref(x.getProfile())).toList();

        // a post with one photo reads that photo's comments as its own; with several, each photo keeps its own
        List<SocialComment> cs = byPost.getOrDefault(p.getId(), List.of()).stream()
            .filter(c -> c.getPostMedia() == null || pm.size() == 1).toList();
        Map<UUID, List<SocialComment>> replies = new HashMap<>();
        List<SocialComment> top = new ArrayList<>();
        for (SocialComment c : cs) {
            if (c.getParent() == null) top.add(c);
            else replies.computeIfAbsent(c.getParent().getId(), k -> new ArrayList<>()).add(c);
        }
        List<SocialComment> shownTop = !withComments ? List.of() : full || top.size() <= PREVIEW_COMMENTS ? top : top.subList(top.size() - PREVIEW_COMMENTS, top.size());
        List<SocialDto.Comment> commentOut = shownTop.stream().map(c -> comment(v, c, replies, commentReactions, keys)).toList();
        int visible = cs.size();
        int commentCount = Math.max(visible, ramp(p.getCommentCount(), p.getPostedAt(), v.t));
        int hidden = Math.max(0, commentCount - commentOut.stream().mapToInt(c -> 1 + c.replies().size()).sum());

        String body = null, excerpt = null, coverUrl = p.getCover() == null ? null : url(p.getCover());
        String title = p.getTitle();
        if (p.getJournalNote() != null) {
            JournalNote n = p.getJournalNote();
            if (title == null) title = n.getTitle();
            if (full) body = p.getBody() != null ? p.getBody() : n.getContent();
            excerpt = n.getExcerpt() != null ? n.getExcerpt() : excerptOf(n.getContent());
            if (coverUrl == null && n.getCoverMedia() != null) coverUrl = url(n.getCoverMedia());
        } else if (p.getBody() != null) {
            if (full) body = p.getBody();
            excerpt = excerptOf(p.getBody());
        }
        SocialDto.Link link = p.getLinkUrl() == null ? null
            : new SocialDto.Link(p.getLinkUrl(), domainOf(p.getLinkUrl()), p.getLinkTitle(), p.getLinkDescription(), p.getLinkImageUrl());
        SocialDto.Place place = p.getPlaceName() == null && p.getPlace() == null ? null
            : new SocialDto.Place(p.getPlaceName() != null ? p.getPlaceName() : v.ref(p.getPlace()).name(), v.ref(p.getPlace()));
        boolean ownWall = p.getWall().getId().equals(p.getAuthor().getId());
        return new SocialDto.Post(p.getId(), p.getExternalKey(), p.getKind().name(), v.ref(p.getAuthor()), ownWall ? null : v.ref(p.getWall()),
            p.getAlbum() == null ? null : new SocialDto.AlbumRef(p.getAlbum().getId(), p.getAlbum().getExternalKey(), p.getAlbum().getTitle()),
            title, p.getText(), excerpt, body != null || p.getBody() != null || p.getJournalNote() != null, body, coverUrl,
            p.getPostedAt(), p.getPostedPrecision() == null ? null : p.getPostedPrecision().name(), p.getEditedAt() != null && !p.getEditedAt().isAfter(v.t) ? p.getEditedAt() : null,
            p.getAudience() == null ? null : p.getAudience().name(), p.getActivity(), p.getActivityIcon(), place,
            p.getEventDate(), p.getEventPrecision() == null ? null : p.getEventPrecision().name(), link, shared, tagged, mediaOut,
            reactions(v, postReactions.getOrDefault(p.getId(), List.of()), p.getLikeCount(), p.getPostedAt()),
            commentCount, ramp(p.getShareCount(), p.getPostedAt(), v.t), hidden, commentOut,
            Boolean.TRUE.equals(p.getPinned()), p.getSource().name());
    }

    private SocialDto.Comment comment(View v, SocialComment c, Map<UUID, List<SocialComment>> replies,
                                      Map<UUID, List<SocialReaction>> reactions, Map<UUID, String> keys) {
        List<SocialDto.Comment> rs = replies.getOrDefault(c.getId(), List.of()).stream().map(r -> comment(v, r, replies, reactions, keys)).toList();
        SocialDto.Reactions rx = reactions(v, reactions.getOrDefault(c.getId(), List.of()), c.getLikeCount(), c.getPostedAt());
        return new SocialDto.Comment(c.getId(), c.getExternalKey(), v.ref(c.getAuthor()), c.getText(),
            c.getMediaFile() == null ? null : mediaOf(c.getMediaFile(), keys, null, null), c.getPostedAt(),
            c.getPostedPrecision() == null ? null : c.getPostedPrecision().name(),
            c.getEditedAt() != null && !c.getEditedAt().isAfter(v.t) ? c.getEditedAt() : null,
            rx, rx.total(), rs, c.getPostMedia() == null ? null : c.getPostMedia().getId(), c.getSource().name());
    }

    /** Likes as of T: the ones kept, or the count the post showed (reached over its first two days), whichever is more. */
    private SocialDto.Reactions reactions(View v, List<SocialReaction> rs, Integer declared, LocalDateTime since) {
        int total = Math.max(rs.size(), ramp(declared, since, v.t));
        Map<SocialReaction.Type, Long> byType = rs.stream().collect(Collectors.groupingBy(SocialReaction::getType, () -> new EnumMap<>(SocialReaction.Type.class), Collectors.counting()));
        List<String> types = byType.entrySet().stream().sorted(Map.Entry.<SocialReaction.Type, Long>comparingByValue().reversed())
            .limit(3).map(e -> e.getKey().name()).collect(Collectors.toCollection(ArrayList::new));
        if (types.isEmpty() && total > 0) types.add(SocialReaction.Type.LIKE.name());
        String mine = null;
        List<SocialProfile> who = new ArrayList<>();
        for (SocialReaction r : rs) {
            if (r.getProfile().getId().equals(v.meId())) { mine = r.getType().name(); who.add(0, r.getProfile()); }
            else if (who.size() < 4) who.add(r.getProfile());
        }
        return new SocialDto.Reactions(total, types, who.stream().limit(3).map(v::ref).toList(), mine);
    }

    /** The declared count reached over the first two days after the post (so a post read an hour in shows little). */
    static int ramp(Integer declared, LocalDateTime since, LocalDateTime t) {
        if (declared == null || declared <= 0 || since == null) return 0;
        double hours = Duration.between(since, t).toMinutes() / 60.0;
        if (hours <= 0) return 0;
        if (hours >= RAMP_HOURS) return declared;
        return (int) Math.ceil(declared * Math.sqrt(hours / RAMP_HOURS));
    }

    private List<SocialDto.Media> media(List<SocialPostMedia> rows) {
        Map<UUID, String> keys = keysOf(rows.stream().map(m -> m.getMediaFile().getId()).collect(Collectors.toSet()));
        return rows.stream().map(m -> mediaOf(m.getMediaFile(), keys, m.getId(), m.getCaption())).toList();
    }

    private SocialDto.Media mediaOf(MediaFile m, Map<UUID, String> keys, UUID itemId, String caption) {
        String poster = m.getPosterStorageKey() == null ? null : storage.buildCdnUrl(m.getPosterStorageKey());
        return new SocialDto.Media(m.getId(), keys.get(m.getId()), itemId, m.getFileType() == null ? null : m.getFileType().name(),
            storage.buildCdnUrl(m.getStorageKey(), m.getStorageProvider()), poster, m.getWidth(), m.getHeight(), caption);
    }

    private Map<UUID, String> keysOf(Collection<UUID> fileIds) {
        if (fileIds.isEmpty()) return Map.of();
        Map<UUID, String> out = new HashMap<>();
        List<UUID> ids = new ArrayList<>(fileIds);
        for (int i = 0; i < ids.size(); i += 1000)
            for (Object[] r : itemRepo.keysOf(ids.subList(i, Math.min(i + 1000, ids.size())))) out.putIfAbsent((UUID) r[0], (String) r[1]);
        return out;
    }

    private static String excerptOf(String html) {
        if (html == null) return null;
        String text = html.replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ").replaceAll("(?s)<br\\s*/?>|</p>|</div>", "\n")
            .replaceAll("(?s)<[^>]+>", "").replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
            .replace("&quot;", "\"").replace("&#39;", "'").replaceAll("[ \\t]+", " ").replaceAll("\\n\\s*\\n+", "\n\n").trim();
        return text.length() <= 400 ? text : text.substring(0, text.lastIndexOf(' ', 400) > 200 ? text.lastIndexOf(' ', 400) : 400) + "…";
    }

    private static String domainOf(String url) {
        try {
            String host = java.net.URI.create(url.trim()).getHost();
            return host == null ? null : host.replaceFirst("^www\\.", "");
        } catch (RuntimeException e) {
            return null;
        }
    }

    // ── Paging ───────────────────────────────────────────────────────────────

    /** "<postedAt>|<id>" of the last post of a page; the next page starts after it. */
    private record Cursor(boolean has, LocalDateTime at, UUID id) {
        static Cursor of(String s) {
            if (s == null || s.isBlank()) return new Cursor(false, LocalDateTime.of(1970, 1, 1, 0, 0), NONE);
            try {
                String[] parts = s.split("\\|");
                return new Cursor(true, LocalDateTime.parse(parts[0]), parts.length > 1 ? UUID.fromString(parts[1]) : new UUID(-1, -1));
            } catch (RuntimeException e) {
                throw new ImportException(400, "before: not a cursor");
            }
        }
    }

    /** Cuts the extra row fetched to know whether there is more; returns the cursor of the next page, or null. */
    private static String nextOf(List<SocialPost> rows, int n) {
        if (rows.size() <= n) return null;
        rows.subList(n, rows.size()).clear();
        SocialPost last = rows.get(rows.size() - 1);
        return last.getPostedAt() + "|" + last.getId();
    }

    private static int clamp(int v, int dflt, int max) { return v <= 0 ? dflt : Math.min(v, max); }

}
