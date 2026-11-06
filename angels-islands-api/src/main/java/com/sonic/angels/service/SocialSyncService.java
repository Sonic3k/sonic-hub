package com.sonic.angels.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonic.angels.model.dto.SocialDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import com.sonic.angels.util.SlugUtil;
import com.sonic.angels.util.SocialTime;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.RecordComponent;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The data API of the Social Media portal: one bundle in, everything in it upserted by key, all or nothing.
 *
 * Order inside a bundle: deletes, profiles (with their names, pictures and intro), albums, posts, comments,
 * reactions, connections, chat members — so anything can refer to what comes before it in the same bundle.
 * A field left out keeps what is stored; a field sent as null clears it; a list sent replaces the stored list.
 * Where only a person's name is known (authorName, tagNames, profileName…) a STUB profile is made for it, keyed
 * "stub:<platform>:<name slug>".
 */
@Service
public class SocialSyncService {

    private static final int MAX_ITEMS = 20_000;

    private final SocialProfileRepository profileRepo;
    private final SocialProfileNameRepository nameRepo;
    private final SocialProfileImageRepository imageRepo;
    private final SocialProfileDetailRepository detailRepo;
    private final SocialAlbumRepository albumRepo;
    private final SocialMediaItemRepository itemRepo;
    private final SocialPostRepository postRepo;
    private final SocialCommentRepository commentRepo;
    private final SocialReactionRepository reactionRepo;
    private final SocialConnectionRepository connectionRepo;
    private final SocialChatMemberRepository memberRepo;
    private final PersonRepository personRepo;
    private final ChatArchiveRepository archiveRepo;
    private final JournalNoteRepository noteRepo;
    private final ObjectMapper om;
    private final EntityManager em;

    public SocialSyncService(SocialProfileRepository profileRepo, SocialProfileNameRepository nameRepo,
                             SocialProfileImageRepository imageRepo, SocialProfileDetailRepository detailRepo,
                             SocialAlbumRepository albumRepo, SocialMediaItemRepository itemRepo,
                             SocialPostRepository postRepo, SocialCommentRepository commentRepo,
                             SocialReactionRepository reactionRepo, SocialConnectionRepository connectionRepo,
                             SocialChatMemberRepository memberRepo, PersonRepository personRepo,
                             ChatArchiveRepository archiveRepo, JournalNoteRepository noteRepo,
                             ObjectMapper om, EntityManager em) {
        this.profileRepo = profileRepo;
        this.nameRepo = nameRepo;
        this.imageRepo = imageRepo;
        this.detailRepo = detailRepo;
        this.albumRepo = albumRepo;
        this.itemRepo = itemRepo;
        this.postRepo = postRepo;
        this.commentRepo = commentRepo;
        this.reactionRepo = reactionRepo;
        this.connectionRepo = connectionRepo;
        this.memberRepo = memberRepo;
        this.personRepo = personRepo;
        this.archiveRepo = archiveRepo;
        this.noteRepo = noteRepo;
        this.om = om;
        this.em = em;
    }

    // ── One call ─────────────────────────────────────────────────────────────

    /** What one bundle touched, and what it looked up on the way. */
    private static final class Ctx {
        final Map<String, Map<String, Integer>> counts = new LinkedHashMap<>();
        final Map<String, String> stubs = new LinkedHashMap<>();
        final List<String> warnings = new ArrayList<>();
        final Map<String, SocialProfile> profiles = new HashMap<>();
        final Map<String, SocialMediaItem> media = new HashMap<>();
        final Map<String, SocialAlbum> albums = new HashMap<>();
        final Map<String, SocialPost> posts = new HashMap<>();
        final Map<String, SocialComment> comments = new HashMap<>();

        void count(String type, String what) {
            counts.computeIfAbsent(type, k -> new LinkedHashMap<>()).merge(what, 1, Integer::sum);
        }
    }

    /** An item of the bundle with the fields it was sent with (left-out fields are kept as stored). */
    private record In<T>(T v, Set<String> has, String where) {
        boolean has(String f) { return has.contains(f); }
    }

    @Transactional
    public SocialDto.SyncResult sync(JsonNode body) {
        if (body == null || !body.isObject()) throw new ImportException(400, "a JSON object is expected");
        Ctx c = new Ctx();
        Set<String> sections = Set.of("delete", "profiles", "albums", "posts", "comments", "reactions", "connections", "chatMembers");
        body.fieldNames().forEachRemaining(f -> { if (!sections.contains(f)) c.warnings.add("unknown section \"" + f + "\" ignored"); });
        int total = 0;
        for (String s : sections) if (body.path(s).isArray()) total += body.path(s).size();
        if (total > MAX_ITEMS) throw new ImportException(400, "too many items in one bundle (" + total + " > " + MAX_ITEMS + ")");

        if (body.hasNonNull("delete")) deletes(read(body.get("delete"), SocialDto.DeleteIn.class, "delete", c).v(), c);

        List<In<SocialDto.ProfileIn>> profiles = list(body, "profiles", SocialDto.ProfileIn.class, c);
        List<In<SocialDto.AlbumIn>> albums = list(body, "albums", SocialDto.AlbumIn.class, c);
        List<In<SocialDto.PostIn>> posts = list(body, "posts", SocialDto.PostIn.class, c);
        List<In<SocialDto.CommentIn>> comments = list(body, "comments", SocialDto.CommentIn.class, c);
        List<In<SocialDto.ReactionIn>> reactions = list(body, "reactions", SocialDto.ReactionIn.class, c);
        List<In<SocialDto.ConnectionIn>> connections = list(body, "connections", SocialDto.ConnectionIn.class, c);
        List<In<SocialDto.ChatMemberIn>> members = list(body, "chatMembers", SocialDto.ChatMemberIn.class, c);

        prefetch(c, profiles, albums, posts, comments, reactions, connections, members);

        for (In<SocialDto.ProfileIn> in : profiles) profile(in, c);
        for (In<SocialDto.AlbumIn> in : albums) album(in, c);
        for (In<SocialDto.PostIn> in : posts) post(in, c);
        comments(comments, c);
        for (In<SocialDto.ReactionIn> in : reactions) reaction(in, c);
        for (In<SocialDto.ConnectionIn> in : connections) connection(in, c);
        for (In<SocialDto.ChatMemberIn> in : members) member(in, c);
        em.flush();
        return new SocialDto.SyncResult(c.counts, c.stubs, c.warnings);
    }

    /** Loads what the bundle refers to in a few queries instead of one per item. */
    private void prefetch(Ctx c, List<In<SocialDto.ProfileIn>> profiles, List<In<SocialDto.AlbumIn>> albums,
                          List<In<SocialDto.PostIn>> posts, List<In<SocialDto.CommentIn>> comments,
                          List<In<SocialDto.ReactionIn>> reactions, List<In<SocialDto.ConnectionIn>> connections,
                          List<In<SocialDto.ChatMemberIn>> members) {
        Set<String> pk = new HashSet<>(), mk = new HashSet<>(), postK = new HashSet<>(), ck = new HashSet<>();
        profiles.forEach(i -> { add(pk, i.v().key()); if (i.v().images() != null) i.v().images().forEach(x -> add(mk, x.media()));
            if (i.v().details() != null) i.v().details().forEach(x -> add(pk, x.related())); });
        albums.forEach(i -> { add(pk, i.v().profile()); add(mk, i.v().cover()); });
        posts.forEach(i -> { var v = i.v(); add(postK, v.key()); add(postK, v.sharedPost()); add(pk, v.author()); add(pk, v.wall()); add(pk, v.place());
            add(mk, v.cover()); if (v.media() != null) v.media().forEach(x -> add(mk, x.media())); if (v.tags() != null) v.tags().forEach(x -> add(pk, x)); });
        comments.forEach(i -> { var v = i.v(); add(ck, v.key()); add(ck, v.parent()); add(postK, v.post()); add(pk, v.author()); add(mk, v.media()); add(mk, v.attachment()); });
        reactions.forEach(i -> { var v = i.v(); add(postK, v.post()); add(ck, v.comment()); add(pk, v.profile()); add(mk, v.media()); });
        connections.forEach(i -> { add(pk, i.v().from()); add(pk, i.v().to()); });
        members.forEach(i -> add(pk, i.v().profile()));
        chunked(pk, ks -> profileRepo.findByExternalKeyIn(ks).forEach(p -> c.profiles.put(p.getExternalKey(), p)));
        chunked(mk, ks -> itemRepo.findByExternalKeyIn(ks).forEach(m -> c.media.put(m.getExternalKey(), m)));
        chunked(postK, ks -> postRepo.findByExternalKeyIn(ks).forEach(p -> c.posts.put(p.getExternalKey(), p)));
        chunked(ck, ks -> commentRepo.findByExternalKeyIn(ks).forEach(x -> c.comments.put(x.getExternalKey(), x)));
    }

    private static void add(Set<String> s, String k) { if (k != null && !k.isBlank()) s.add(k.trim()); }

    private static void chunked(Set<String> keys, java.util.function.Consumer<List<String>> load) {
        List<String> all = new ArrayList<>(keys);
        for (int i = 0; i < all.size(); i += 1000) load.accept(all.subList(i, Math.min(i + 1000, all.size())));
    }

    // ── Reading the bundle ───────────────────────────────────────────────────

    private <T> List<In<T>> list(JsonNode body, String field, Class<T> type, Ctx c) {
        JsonNode arr = body.get(field);
        if (arr == null || arr.isNull()) return List.of();
        if (!arr.isArray()) throw new ImportException(400, field + " must be a list");
        List<In<T>> out = new ArrayList<>(arr.size());
        for (int i = 0; i < arr.size(); i++) out.add(read(arr.get(i), type, field + "[" + i + "]", c));
        return out;
    }

    private <T> In<T> read(JsonNode n, Class<T> type, String where, Ctx c) {
        if (n == null || !n.isObject()) throw new ImportException(400, where + ": an object is expected");
        Set<String> has = new HashSet<>();
        n.fieldNames().forEachRemaining(has::add);
        warnUnknown(n, type, where, c);
        try {
            return new In<>(om.treeToValue(n, type), has, where);
        } catch (JsonProcessingException e) {
            throw new ImportException(400, where + ": " + e.getOriginalMessage());
        }
    }

    /** A misspelt field would silently do nothing: say so. Looks one level into the lists a profile or post carries. */
    private void warnUnknown(JsonNode n, Class<?> type, String where, Ctx c) {
        if (!type.isRecord()) return;
        Map<String, RecordComponent> known = Arrays.stream(type.getRecordComponents()).collect(Collectors.toMap(RecordComponent::getName, r -> r));
        n.fieldNames().forEachRemaining(f -> {
            RecordComponent rc = known.get(f);
            if (rc == null) { c.warnings.add(where + ": unknown field \"" + f + "\" ignored"); return; }
            if (rc.getGenericType() instanceof java.lang.reflect.ParameterizedType pt && n.get(f).isArray()
                && pt.getActualTypeArguments()[0] instanceof Class<?> inner && inner.isRecord())
                for (int i = 0; i < n.get(f).size(); i++) warnUnknown(n.get(f).get(i), inner, where + "." + f + "[" + i + "]", c);
            else if (rc.getType().isRecord() && n.get(f).isObject()) warnUnknown(n.get(f), rc.getType(), where + "." + f, c);
        });
    }

    // ── Deletes ──────────────────────────────────────────────────────────────

    private void deletes(SocialDto.DeleteIn d, Ctx c) {
        if (d == null) return;
        em.flush();
        // a picture-change post goes with its picture window only when the window goes; deleting a post leaves the window
        del(d.chatMembers(), "chatMembers", "SocialChatMember", c);
        del(d.connections(), "connections", "SocialConnection", c);
        del(d.reactions(), "reactions", "SocialReaction", c);
        del(d.comments(), "comments", "SocialComment", c);
        del(d.posts(), "posts", "SocialPost", c);
        del(d.albums(), "albums", "SocialAlbum", c);
        if (d.profiles() != null && !d.profiles().isEmpty()) {
            // a profile's picture-change posts stand on its own wall, so they go with it (rows below cascade in the database)
            del(d.profiles(), "profiles", "SocialProfile", c);
        }
        em.clear();
    }

    private void del(List<String> keys, String type, String entity, Ctx c) {
        if (keys == null || keys.isEmpty()) return;
        List<String> ks = keys.stream().filter(Objects::nonNull).map(String::trim).toList();
        for (int i = 0; i < ks.size(); i += 1000) {
            int n = em.createQuery("DELETE FROM " + entity + " x WHERE x.externalKey IN :keys")
                .setParameter("keys", ks.subList(i, Math.min(i + 1000, ks.size()))).executeUpdate();
            for (int j = 0; j < n; j++) c.count(type, "deleted");
        }
    }

    /** Deletes one thing by key; false when there was nothing under it. type: profiles, albums, posts, comments,
     *  reactions, connections, chatMembers. */
    @Transactional
    public boolean deleteOne(String type, String key) {
        String entity = switch (type) {
            case "profiles" -> "SocialProfile";
            case "albums" -> "SocialAlbum";
            case "posts" -> "SocialPost";
            case "comments" -> "SocialComment";
            case "reactions" -> "SocialReaction";
            case "connections" -> "SocialConnection";
            case "chat-members", "chatMembers" -> "SocialChatMember";
            default -> throw new ImportException(404, "unknown type " + type);
        };
        int n = em.createQuery("DELETE FROM " + entity + " x WHERE x.externalKey = :key").setParameter("key", key.trim()).executeUpdate();
        em.clear();
        return n > 0;
    }

    // ── Profiles ─────────────────────────────────────────────────────────────

    private SocialProfile profile(In<SocialDto.ProfileIn> it, Ctx c) {
        SocialDto.ProfileIn in = it.v();
        String key = SocialMediaService.requireKey(in.key());
        SocialProfile p = c.profiles.get(key);
        boolean created = p == null;
        if (created) { p = new SocialProfile(); p.setExternalKey(key); }

        if (created || it.has("platform")) p.setPlatform(enumOf(SocialProfile.Platform.class, in.platform(), SocialProfile.Platform.FACEBOOK, it.where() + ".platform"));
        if (created || it.has("kind")) p.setKind(enumOf(SocialProfile.Kind.class, in.kind(), SocialProfile.Kind.USER, it.where() + ".kind"));
        if (created || it.has("level")) p.setLevel(enumOf(SocialProfile.Level.class, in.level(), SocialProfile.Level.FULL, it.where() + ".level"));
        if (it.has("person") || it.has("personId")) p.setPerson(person(in.person(), in.personId(), it.where()));
        if (created || it.has("name")) {
            String name = blank(in.name()) ? (p.getPerson() != null ? firstNonBlank(p.getPerson().getDisplayName(), p.getPerson().getName()) : null) : in.name().trim();
            if (blank(name)) throw new ImportException(400, it.where() + ": name is required");
            p.setName(cut(name, 255));
        }
        if (it.has("handle")) {
            String h = blank(in.handle()) ? null : in.handle().trim();
            if (h != null) {
                SocialProfile other = profileRepo.findByPlatformAndHandle(p.getPlatform(), h).orElse(null);
                if (other != null && !other.getExternalKey().equals(key))
                    throw new ImportException(400, it.where() + ": handle " + h + " is already " + other.getExternalKey() + "'s");
            }
            p.setHandle(cut(h, 100));
        }
        if (it.has("platformId")) p.setPlatformId(cut(trim(in.platformId()), 100));
        if (it.has("gender")) p.setGender(enumOf(Person.Gender.class, in.gender(), null, it.where() + ".gender"));
        if (it.has("joinedAt")) p.setJoinedAt(time(in.joinedAt(), it.where() + ".joinedAt"));
        if (it.has("closedAt")) p.setClosedAt(time(in.closedAt(), it.where() + ".closedAt"));
        if (it.has("privacy")) p.setPrivacy(enumOf(SocialProfile.Privacy.class, in.privacy(), null, it.where() + ".privacy"));
        if (it.has("category")) p.setCategory(cut(trim(in.category()), 100));
        if (it.has("verified")) p.setVerified(Boolean.TRUE.equals(in.verified()));
        if (it.has("declaredCount")) p.setDeclaredCount(in.declaredCount());
        if (it.has("chatArchive")) p.setChatArchive(blank(in.chatArchive()) ? null : archive(in.chatArchive(), null, it.where()));
        if (created || it.has("source")) p.setSource(SocialMediaService.source(in.source()));
        if (it.has("note")) p.setNote(trim(in.note()));
        p = profileRepo.save(p);
        c.profiles.put(key, p);
        c.count("profiles", created ? "created" : "updated");

        if (it.has("names")) names(p, in.names(), it.where(), c);
        if (it.has("images")) images(p, in.images(), it.where(), c);
        if (it.has("details")) details(p, in.details(), it.where(), c);
        return p;
    }

    private void names(SocialProfile p, List<SocialDto.NameIn> list, String where, Ctx c) {
        List<SocialDto.NameIn> want = list == null ? List.of() : list;
        Map<String, SocialProfileName> have = nameRepo.findByProfileId(p.getId()).stream()
            .collect(Collectors.toMap(SocialProfileName::getExternalKey, n -> n, (a, b) -> a));
        Set<String> keep = new HashSet<>();
        List<String> keys = new ArrayList<>();
        for (int i = 0; i < want.size(); i++) {
            SocialDto.NameIn n = want.get(i);
            if (blank(n.name())) throw new ImportException(400, where + ".names[" + i + "]: name is required");
            keys.add(blank(n.key()) ? p.getExternalKey() + "/name/" + SlugUtil.slugify(n.name()) + "/" + (blank(n.from()) ? "_" : n.from().trim()) : n.key().trim());
        }
        ownKeys(nameRepo.findByExternalKeyIn(keys), SocialProfileName::getProfile, p, where + ".names");
        for (int i = 0; i < want.size(); i++) {
            SocialDto.NameIn n = want.get(i);
            String k = keys.get(i);
            if (!keep.add(k)) throw new ImportException(400, where + ".names[" + i + "]: key " + k + " used twice");
            SocialProfileName row = have.get(k);
            if (row == null) { row = new SocialProfileName(); row.setExternalKey(k); row.setProfile(p); }
            row.setName(cut(n.name().trim(), 255));
            row.setValidFrom(time(n.from(), where + ".names[" + i + "].from"));
            row.setValidTo(time(n.to(), where + ".names[" + i + "].to"));
            row.setSource(SocialMediaService.source(n.source()));
            nameRepo.save(row);
        }
        have.values().stream().filter(r -> !keep.contains(r.getExternalKey())).forEach(nameRepo::delete);
    }

    private void images(SocialProfile p, List<SocialDto.ImageIn> list, String where, Ctx c) {
        List<SocialDto.ImageIn> want = list == null ? List.of() : list;
        Map<String, SocialProfileImage> have = imageRepo.findByProfileId(p.getId()).stream()
            .collect(Collectors.toMap(SocialProfileImage::getExternalKey, n -> n, (a, b) -> a));
        List<String> keys = new ArrayList<>();
        for (int i = 0; i < want.size(); i++) {
            SocialDto.ImageIn n = want.get(i);
            String w = where + ".images[" + i + "]";
            SocialProfileImage.Kind kind = enumOf(SocialProfileImage.Kind.class, n.kind(), null, w + ".kind");
            if (kind == null) throw new ImportException(400, w + ": kind (AVATAR or COVER) is required");
            if (blank(n.media())) throw new ImportException(400, w + ": media (a media key) is required");
            keys.add(blank(n.key()) ? p.getExternalKey() + "/" + kind.name().toLowerCase(Locale.ROOT) + "/" + n.media().trim() + "/" + (blank(n.from()) ? "default" : n.from().trim()) : n.key().trim());
        }
        ownKeys(imageRepo.findByExternalKeyIn(keys), SocialProfileImage::getProfile, p, where + ".images");
        Set<String> keep = new HashSet<>();
        for (int i = 0; i < want.size(); i++) {
            SocialDto.ImageIn n = want.get(i);
            String w = where + ".images[" + i + "]", k = keys.get(i);
            if (!keep.add(k)) throw new ImportException(400, w + ": key " + k + " used twice");
            SocialProfileImage row = have.get(k);
            if (row == null) { row = new SocialProfileImage(); row.setExternalKey(k); row.setProfile(p); }
            row.setKind(SocialProfileImage.Kind.valueOf(n.kind().trim().toUpperCase(Locale.ROOT)));
            row.setMediaFile(media(n.media(), w, c));
            SocialTime.Moment from = moment(n.from(), w + ".from");
            row.setValidFrom(from == null ? null : from.utc());
            row.setValidTo(time(n.to(), w + ".to"));
            row.setDefault(Boolean.TRUE.equals(n.isDefault()));
            row.setFocusX(n.focusX());
            row.setFocusY(n.focusY());
            row.setSource(SocialMediaService.source(n.source()));
            row = imageRepo.save(row);
            boolean announce = from != null && !Boolean.FALSE.equals(n.announce());
            if (announce) row.setPost(announcement(p, row, from, n, c));
            else if (row.getPost() != null) { SocialPost old = row.getPost(); row.setPost(null); postRepo.delete(old); }
            imageRepo.save(row);
        }
        for (SocialProfileImage gone : have.values()) {
            if (keep.contains(gone.getExternalKey())) continue;
            SocialPost post = gone.getPost();
            imageRepo.delete(gone);
            if (post != null) postRepo.delete(post);
        }
    }

    /** The "updated his profile picture / cover photo" post of a picture window: key <image key>#post. */
    private SocialPost announcement(SocialProfile p, SocialProfileImage img, SocialTime.Moment from, SocialDto.ImageIn n, Ctx c) {
        String key = img.getExternalKey() + "#post";
        SocialPost post = img.getPost() != null ? img.getPost() : c.posts.get(key);
        if (post == null) post = postRepo.findByExternalKey(key).orElse(null);
        boolean created = post == null;
        if (created) { post = new SocialPost(); post.setExternalKey(key); }
        post.setKind(img.getKind() == SocialProfileImage.Kind.AVATAR ? SocialPost.Kind.AVATAR_CHANGE : SocialPost.Kind.COVER_CHANGE);
        post.setAuthor(p);
        post.setWall(p);
        post.setPostedAt(from.utc());
        post.setPostedPrecision(from.precision());
        post.setText(trim(n.caption()));
        post.setAudience(enumOf(SocialPost.Audience.class, n.audience(), null, "audience"));
        post.setSource(img.getSource());
        setMedia(post, List.of(new SocialDto.PostMediaIn(n.media(), null)), "announcement", c);
        post = postRepo.save(post);
        c.posts.put(key, post);
        c.count("posts", created ? "created" : "updated");
        return post;
    }

    private void details(SocialProfile p, List<SocialDto.DetailIn> list, String where, Ctx c) {
        List<SocialDto.DetailIn> want = list == null ? List.of() : list;
        Map<String, SocialProfileDetail> have = detailRepo.findByProfileId(p.getId()).stream()
            .collect(Collectors.toMap(SocialProfileDetail::getExternalKey, n -> n, (a, b) -> a));
        List<String> keys = new ArrayList<>();
        for (int i = 0; i < want.size(); i++) {
            SocialDto.DetailIn n = want.get(i);
            String w = where + ".details[" + i + "]";
            SocialProfileDetail.Kind kind = enumOf(SocialProfileDetail.Kind.class, n.kind(), null, w + ".kind");
            if (kind == null) throw new ImportException(400, w + ": kind is required");
            keys.add(blank(n.key()) ? p.getExternalKey() + "/" + kind.name().toLowerCase(Locale.ROOT) + "/"
                + SlugUtil.slugify(firstNonBlank(n.title(), n.subtitle(), n.relatedName(), n.related(), "x")) + "/"
                + firstNonBlank(n.start(), n.from(), "_") : n.key().trim());
        }
        ownKeys(detailRepo.findByExternalKeyIn(keys), SocialProfileDetail::getProfile, p, where + ".details");
        Set<String> keep = new HashSet<>();
        for (int i = 0; i < want.size(); i++) {
            SocialDto.DetailIn n = want.get(i);
            String w = where + ".details[" + i + "]", k = keys.get(i);
            if (!keep.add(k)) throw new ImportException(400, w + ": key " + k + " used twice");
            SocialProfileDetail row = have.get(k);
            if (row == null) { row = new SocialProfileDetail(); row.setExternalKey(k); row.setProfile(p); }
            row.setKind(SocialProfileDetail.Kind.valueOf(n.kind().trim().toUpperCase(Locale.ROOT)));
            row.setTitle(cut(trim(n.title()), 500));
            row.setSubtitle(cut(trim(n.subtitle()), 500));
            row.setBody(trim(n.body()));
            row.setRelated(ref(n.related(), n.relatedName(), p.getPlatform(), w + ".related", c));
            try {
                row.setStartDate(SocialTime.date(n.start()));
                row.setEndDate(SocialTime.date(n.end()));
            } catch (IllegalArgumentException e) {
                throw new ImportException(400, w + ": " + e.getMessage());
            }
            DatePrecision pr = blank(n.precision()) ? SocialTime.datePrecision(firstNonBlank(n.start(), n.end()))
                : enumOf(DatePrecision.class, n.precision(), null, w + ".precision");
            row.setDatePrecision(pr);
            row.setValidFrom(time(n.from(), w + ".from"));
            row.setValidTo(time(n.to(), w + ".to"));
            row.setSortOrder(n.order());
            row.setSource(SocialMediaService.source(n.source()));
            detailRepo.save(row);
        }
        have.values().stream().filter(r -> !keep.contains(r.getExternalKey())).forEach(detailRepo::delete);
    }

    /** A key is unique across all profiles: refuse one that belongs to someone else's row. */
    private static <R> void ownKeys(List<R> rows, Function<R, SocialProfile> owner, SocialProfile p, String where) {
        for (R r : rows) {
            SocialProfile o = owner.apply(r);
            if (o != null && !o.getId().equals(p.getId()))
                throw new ImportException(400, where + ": a key is already used on " + o.getExternalKey());
        }
    }

    // ── Albums ───────────────────────────────────────────────────────────────

    private void album(In<SocialDto.AlbumIn> it, Ctx c) {
        SocialDto.AlbumIn in = it.v();
        String key = SocialMediaService.requireKey(in.key());
        SocialAlbum a = c.albums.containsKey(key) ? c.albums.get(key) : albumRepo.findByExternalKey(key).orElse(null);
        boolean created = a == null;
        if (created) { a = new SocialAlbum(); a.setExternalKey(key); }
        if (created || it.has("profile")) {
            SocialProfile owner = profileByKey(in.profile(), it.where() + ".profile", c);
            if (owner == null) throw new ImportException(400, it.where() + ": profile is required");
            a.setProfile(owner);
        }
        if (created || it.has("title")) {
            if (blank(in.title())) throw new ImportException(400, it.where() + ": title is required");
            a.setTitle(cut(in.title().trim(), 300));
        }
        if (it.has("description")) a.setDescription(trim(in.description()));
        if (it.has("location")) a.setLocation(cut(trim(in.location()), 300));
        if (it.has("cover")) a.setCover(blank(in.cover()) ? null : media(in.cover(), it.where() + ".cover", c));
        if (it.has("publishedAt")) a.setPublishedAt(time(in.publishedAt(), it.where() + ".publishedAt"));
        if (created || it.has("source")) a.setSource(SocialMediaService.source(in.source()));
        a = albumRepo.save(a);
        c.albums.put(key, a);
        c.count("albums", created ? "created" : "updated");
    }

    private SocialAlbum albumByKey(String key, String where, Ctx c) {
        if (blank(key)) return null;
        String k = key.trim();
        SocialAlbum a = c.albums.get(k);
        if (a == null) a = albumRepo.findByExternalKey(k).orElseThrow(() -> new ImportException(400, where + ": unknown album " + k));
        c.albums.put(k, a);
        return a;
    }

    // ── Posts ────────────────────────────────────────────────────────────────

    private void post(In<SocialDto.PostIn> it, Ctx c) {
        SocialDto.PostIn in = it.v();
        String w = it.where();
        String key = SocialMediaService.requireKey(in.key());
        SocialPost p = c.posts.get(key);
        boolean created = p == null;
        if (created) { p = new SocialPost(); p.setExternalKey(key); }

        if (created || it.has("author") || it.has("authorName")) {
            SocialProfile author = ref(in.author(), in.authorName(), platformOf(in.wall(), c), w + ".author", c);
            if (author == null) throw new ImportException(400, w + ": author (a key) or authorName is required");
            p.setAuthor(author);
        }
        if (created || it.has("wall")) p.setWall(blank(in.wall()) ? p.getAuthor() : profileByKey(in.wall(), w + ".wall", c));
        if (it.has("album")) p.setAlbum(albumByKey(in.album(), w + ".album", c));
        if (it.has("sharedPost")) p.setSharedPost(blank(in.sharedPost()) ? null : postByKey(in.sharedPost(), w + ".sharedPost", c));
        if (it.has("journalNoteId") || it.has("journalNoteSlug")) p.setJournalNote(journal(in.journalNoteId(), in.journalNoteSlug(), w));
        if (it.has("title")) p.setTitle(cut(trim(in.title()), 500));
        if (it.has("text")) p.setText(in.text());
        if (it.has("body")) p.setBody(in.body());
        if (it.has("cover")) p.setCover(blank(in.cover()) ? null : media(in.cover(), w + ".cover", c));
        if (created || it.has("postedAt") || it.has("precision")) {
            SocialTime.Moment m = moment(it.has("postedAt") || created ? in.postedAt() : null, w + ".postedAt");
            if (m == null && created) throw new ImportException(400, w + ": postedAt is required");
            if (m != null) {
                p.setPostedAt(m.utc());
                p.setPostedPrecision(blank(in.precision()) ? m.precision() : enumOf(DatePrecision.class, in.precision(), null, w + ".precision"));
            } else if (it.has("precision")) p.setPostedPrecision(enumOf(DatePrecision.class, in.precision(), null, w + ".precision"));
        }
        if (it.has("editedAt")) p.setEditedAt(time(in.editedAt(), w + ".editedAt"));
        if (it.has("audience")) p.setAudience(enumOf(SocialPost.Audience.class, in.audience(), null, w + ".audience"));
        if (it.has("activity")) p.setActivity(cut(trim(in.activity()), 300));
        if (it.has("activityIcon")) p.setActivityIcon(cut(trim(in.activityIcon()), 16));
        if (it.has("placeName")) p.setPlaceName(cut(trim(in.placeName()), 300));
        if (it.has("place")) p.setPlace(blank(in.place()) ? null : profileByKey(in.place(), w + ".place", c));
        if (it.has("eventDate") || it.has("eventPrecision")) {
            SocialTime.Moment m = moment(in.eventDate(), w + ".eventDate");
            p.setEventDate(m == null ? null : m.utc());
            p.setEventPrecision(m == null ? null : blank(in.eventPrecision()) ? m.precision() : enumOf(DatePrecision.class, in.eventPrecision(), null, w + ".eventPrecision"));
        }
        if (it.has("link")) {
            SocialDto.LinkIn l = in.link();
            p.setLinkUrl(l == null ? null : cut(trim(l.url()), 2000));
            p.setLinkTitle(l == null ? null : cut(trim(l.title()), 500));
            p.setLinkDescription(l == null ? null : trim(l.description()));
            p.setLinkImageUrl(l == null ? null : cut(trim(l.imageUrl()), 2000));
        }
        if (it.has("likeCount")) p.setLikeCount(in.likeCount());
        if (it.has("commentCount")) p.setCommentCount(in.commentCount());
        if (it.has("shareCount")) p.setShareCount(in.shareCount());
        if (it.has("pinned")) p.setPinned(Boolean.TRUE.equals(in.pinned()));
        if (it.has("originArchiveId")) p.setOriginArchiveId(in.originArchiveId());
        if (it.has("originSeq")) p.setOriginSeq(in.originSeq());
        if (created || it.has("source")) p.setSource(SocialMediaService.source(in.source()));
        if (it.has("note")) p.setNote(trim(in.note()));
        if (it.has("media")) setMedia(p, in.media(), w, c);
        if (it.has("tags") || it.has("tagNames")) setTags(p, in.tags(), in.tagNames(), w, c);

        if (it.has("kind")) p.setKind(enumOf(SocialPost.Kind.class, in.kind(), SocialPost.Kind.STATUS, w + ".kind"));
        else if (created) p.setKind(kindOf(p));
        p = postRepo.save(p);
        c.posts.put(key, p);
        c.count("posts", created ? "created" : "updated");
    }

    private static SocialPost.Kind kindOf(SocialPost p) {
        if ((p.getTitle() != null && p.getBody() != null) || p.getJournalNote() != null) return SocialPost.Kind.NOTE;
        if (p.getSharedPost() != null) return SocialPost.Kind.SHARE;
        if (!p.getMedia().isEmpty()) return SocialPost.Kind.PHOTO;
        if (p.getLinkUrl() != null) return SocialPost.Kind.LINK;
        if (p.getPlaceName() != null || p.getPlace() != null) return SocialPost.Kind.CHECK_IN;
        return SocialPost.Kind.STATUS;
    }

    /** The post's photos become exactly this list; a photo still in it keeps its row (and its comments and likes). */
    private void setMedia(SocialPost p, List<SocialDto.PostMediaIn> list, String where, Ctx c) {
        List<SocialDto.PostMediaIn> want = list == null ? List.of() : list;
        Map<UUID, SocialPostMedia> have = new HashMap<>();
        for (SocialPostMedia pm : p.getMedia()) have.putIfAbsent(pm.getMediaFile().getId(), pm);
        List<SocialPostMedia> next = new ArrayList<>();
        for (int i = 0; i < want.size(); i++) {
            SocialDto.PostMediaIn in = want.get(i);
            if (in == null || blank(in.media())) throw new ImportException(400, where + ".media[" + i + "]: media (a media key) is required");
            MediaFile mf = media(in.media(), where + ".media[" + i + "]", c);
            SocialPostMedia pm = have.remove(mf.getId());
            if (pm == null) { pm = new SocialPostMedia(); pm.setPost(p); pm.setMediaFile(mf); }
            pm.setPosition(i);
            pm.setCaption(trim(in.caption()));
            next.add(pm);
        }
        p.getMedia().removeIf(pm -> !next.contains(pm));
        for (SocialPostMedia pm : next) if (!p.getMedia().contains(pm)) p.getMedia().add(pm);
        p.getMedia().sort(Comparator.comparingInt(SocialPostMedia::getPosition));
    }

    private void setTags(SocialPost p, List<String> keys, List<String> names, String where, Ctx c) {
        List<SocialProfile> want = new ArrayList<>();
        Set<UUID> wantIds = new LinkedHashSet<>();
        SocialProfile.Platform platform = p.getWall() != null ? p.getWall().getPlatform() : SocialProfile.Platform.FACEBOOK;
        if (keys != null) for (String k : keys) { SocialProfile t = profileByKey(k, where + ".tags", c); if (t != null && wantIds.add(t.getId())) want.add(t); }
        if (names != null) for (String n : names) { if (blank(n)) continue; SocialProfile t = stub(n, platform, c); if (wantIds.add(t.getId())) want.add(t); }
        p.getTags().removeIf(t -> !wantIds.contains(t.getProfile().getId()));
        List<UUID> order = new ArrayList<>(wantIds);
        Set<UUID> have = p.getTags().stream().map(t -> t.getProfile().getId()).collect(Collectors.toSet());
        for (SocialProfile t : want) {
            if (have.contains(t.getId())) continue;
            SocialPostTag tag = new SocialPostTag();
            tag.setPost(p);
            tag.setProfile(t);
            p.getTags().add(tag);
        }
        for (SocialPostTag tag : p.getTags()) tag.setPosition(order.indexOf(tag.getProfile().getId()));
    }

    private SocialPost postByKey(String key, String where, Ctx c) {
        String k = key.trim();
        SocialPost p = c.posts.get(k);
        if (p == null) p = postRepo.findByExternalKey(k).orElseThrow(() -> new ImportException(400, where + ": unknown post " + k));
        c.posts.put(k, p);
        return p;
    }

    private JournalNote journal(UUID id, String slug, String where) {
        if (id != null) return noteRepo.findById(id).orElseThrow(() -> new ImportException(400, where + ": no journal note " + id));
        if (!blank(slug)) return noteRepo.findBySlug(slug.trim()).orElseThrow(() -> new ImportException(400, where + ": no journal note " + slug));
        return null;
    }

    // ── Comments ─────────────────────────────────────────────────────────────

    /** Replies may come before the comment they answer in the bundle: those wait for a later pass. */
    private void comments(List<In<SocialDto.CommentIn>> items, Ctx c) {
        List<In<SocialDto.CommentIn>> pending = new ArrayList<>(items);
        while (!pending.isEmpty()) {
            List<In<SocialDto.CommentIn>> later = new ArrayList<>();
            for (In<SocialDto.CommentIn> it : pending) {
                String parent = trim(it.v().parent());
                boolean parentLater = parent != null && !c.comments.containsKey(parent)
                    && pending.stream().anyMatch(o -> o != it && parent.equals(trim(o.v().key())));
                if (parentLater) later.add(it); else comment(it, c);
            }
            if (later.size() == pending.size())
                throw new ImportException(400, later.get(0).where() + ": its parent comment never comes (a loop of replies?)");
            pending = later;
        }
    }

    private void comment(In<SocialDto.CommentIn> it, Ctx c) {
        SocialDto.CommentIn in = it.v();
        String w = it.where();
        String key = SocialMediaService.requireKey(in.key());
        SocialComment x = c.comments.get(key);
        boolean created = x == null;
        if (created) { x = new SocialComment(); x.setExternalKey(key); }
        if (created || it.has("post")) {
            if (blank(in.post())) throw new ImportException(400, w + ": post is required");
            x.setPost(postByKey(in.post(), w + ".post", c));
        }
        if (it.has("media")) x.setPostMedia(blank(in.media()) ? null : photoOf(x.getPost(), in.media(), w + ".media", c));
        if (it.has("parent")) {
            if (blank(in.parent())) x.setParent(null);
            else {
                SocialComment parent = c.comments.get(in.parent().trim());
                if (parent == null) parent = commentRepo.findByExternalKey(in.parent().trim()).orElseThrow(() -> new ImportException(400, w + ": unknown parent comment " + in.parent()));
                if (!parent.getPost().getId().equals(x.getPost().getId())) throw new ImportException(400, w + ": the parent comment is on another post");
                x.setParent(parent);
            }
        }
        if (created || it.has("author") || it.has("authorName")) {
            SocialProfile a = ref(in.author(), in.authorName(), x.getPost().getWall().getPlatform(), w + ".author", c);
            if (a == null) throw new ImportException(400, w + ": author (a key) or authorName is required");
            x.setAuthor(a);
        }
        if (it.has("text")) x.setText(in.text());
        if (it.has("attachment")) x.setMediaFile(blank(in.attachment()) ? null : media(in.attachment(), w + ".attachment", c));
        if (created || it.has("postedAt") || it.has("precision")) {
            SocialTime.Moment m = moment(in.postedAt(), w + ".postedAt");
            if (m == null && created) throw new ImportException(400, w + ": postedAt is required");
            if (m != null) {
                x.setPostedAt(m.utc());
                x.setPostedPrecision(blank(in.precision()) ? m.precision() : enumOf(DatePrecision.class, in.precision(), null, w + ".precision"));
            }
        }
        if (it.has("editedAt")) x.setEditedAt(time(in.editedAt(), w + ".editedAt"));
        if (it.has("likeCount")) x.setLikeCount(in.likeCount());
        if (it.has("originArchiveId")) x.setOriginArchiveId(in.originArchiveId());
        if (it.has("originSeq")) x.setOriginSeq(in.originSeq());
        if (created || it.has("source")) x.setSource(SocialMediaService.source(in.source()));
        x = commentRepo.save(x);
        c.comments.put(key, x);
        c.count("comments", created ? "created" : "updated");
    }

    /** One photo of a post, by the key of its media item. */
    private SocialPostMedia photoOf(SocialPost post, String mediaKey, String where, Ctx c) {
        MediaFile mf = media(mediaKey, where, c);
        return post.getMedia().stream().filter(pm -> pm.getMediaFile().getId().equals(mf.getId())).findFirst()
            .orElseThrow(() -> new ImportException(400, where + ": " + mediaKey + " is not a photo of " + post.getExternalKey()));
    }

    // ── Reactions ────────────────────────────────────────────────────────────

    private void reaction(In<SocialDto.ReactionIn> it, Ctx c) {
        SocialDto.ReactionIn in = it.v();
        String w = it.where();
        SocialComment comment = null;
        SocialPost post = null;
        SocialPostMedia photo = null;
        String target;
        if (!blank(in.comment())) {
            comment = c.comments.get(in.comment().trim());
            if (comment == null) comment = commentRepo.findByExternalKey(in.comment().trim()).orElseThrow(() -> new ImportException(400, w + ": unknown comment " + in.comment()));
            c.comments.put(comment.getExternalKey(), comment);
            post = comment.getPost();
            target = comment.getExternalKey();
        } else if (!blank(in.post())) {
            post = postByKey(in.post(), w + ".post", c);
            if (!blank(in.media())) photo = photoOf(post, in.media(), w + ".media", c);
            target = post.getExternalKey() + (photo == null ? "" : "@" + in.media().trim());
        } else throw new ImportException(400, w + ": post or comment is required");
        SocialProfile who = ref(in.profile(), in.profileName(), post.getWall().getPlatform(), w + ".profile", c);
        if (who == null) throw new ImportException(400, w + ": profile (a key) or profileName is required");
        String key = blank(in.key()) ? "r:" + target + ":" + who.getExternalKey() : in.key().trim();
        SocialReaction r = reactionRepo.findByExternalKey(key).orElse(null);
        boolean created = r == null;
        if (created) { r = new SocialReaction(); r.setExternalKey(cut(key, 400)); }
        r.setComment(comment);
        r.setPost(post);
        r.setPostMedia(photo);
        r.setProfile(who);
        r.setType(enumOf(SocialReaction.Type.class, in.type(), SocialReaction.Type.LIKE, w + ".type"));
        if (created || it.has("at")) r.setReactedAt(time(in.at(), w + ".at"));
        if (created || it.has("source")) r.setSource(SocialMediaService.source(in.source()));
        reactionRepo.save(r);
        c.count("reactions", created ? "created" : "updated");
    }

    // ── Connections ──────────────────────────────────────────────────────────

    private void connection(In<SocialDto.ConnectionIn> it, Ctx c) {
        SocialDto.ConnectionIn in = it.v();
        String w = it.where();
        SocialConnection.Kind kind = enumOf(SocialConnection.Kind.class, in.kind(), null, w + ".kind");
        if (kind == null) throw new ImportException(400, w + ": kind is required");
        SocialProfile.Platform platform = platformOf(firstNonBlank(in.to(), in.from()), c);
        SocialProfile from = ref(in.from(), in.fromName(), platform, w + ".from", c);
        SocialProfile to = ref(in.to(), in.toName(), platform, w + ".to", c);
        if (from == null || to == null) throw new ImportException(400, w + ": from and to are required");
        if (from.getId().equals(to.getId())) throw new ImportException(400, w + ": from and to are the same profile");
        String a = from.getExternalKey(), b = to.getExternalKey();
        String key = !blank(in.key()) ? in.key().trim() : kind == SocialConnection.Kind.FRIEND
            ? "friend:" + (a.compareTo(b) <= 0 ? a + "~" + b : b + "~" + a)
            : kind.name().toLowerCase(Locale.ROOT) + ":" + a + ">" + b;
        SocialConnection x = connectionRepo.findByExternalKey(key).orElse(null);
        boolean created = x == null;
        if (created) { x = new SocialConnection(); x.setExternalKey(cut(key, 500)); }
        x.setKind(kind);
        x.setFrom(from);
        x.setTo(to);
        if (created || it.has("since")) x.setValidFrom(time(in.since(), w + ".since"));
        if (created || it.has("until")) x.setValidTo(time(in.until(), w + ".until"));
        if (created || it.has("source")) x.setSource(SocialMediaService.source(in.source()));
        connectionRepo.save(x);
        c.count("connections", created ? "created" : "updated");
    }

    // ── Messenger members ────────────────────────────────────────────────────

    private void member(In<SocialDto.ChatMemberIn> it, Ctx c) {
        SocialDto.ChatMemberIn in = it.v();
        String w = it.where();
        ChatArchive a = archive(in.archive(), in.archiveId(), w);
        if (a == null) throw new ImportException(400, w + ": archive (its externalKey) or archiveId is required");
        if (blank(in.sender())) throw new ImportException(400, w + ": sender (the name as stored in the messages) is required");
        SocialProfile who = ref(in.profile(), in.profileName(), SocialProfile.Platform.FACEBOOK, w + ".profile", c);
        if (who == null) throw new ImportException(400, w + ": profile (a key) or profileName is required");
        String key = blank(in.key()) ? a.getId() + "/" + in.sender() + "/" + (blank(in.from()) ? "_" : in.from().trim()) : in.key().trim();
        SocialChatMember m = memberRepo.findByExternalKey(key).orElse(null);
        boolean created = m == null;
        if (created) { m = new SocialChatMember(); m.setExternalKey(cut(key, 500)); }
        m.setArchive(a);
        m.setSenderName(cut(in.sender(), 300));
        m.setProfile(who);
        if (created || it.has("nickname")) m.setNickname(cut(trim(in.nickname()), 200));
        if (created || it.has("from")) m.setValidFrom(time(in.from(), w + ".from"));
        if (created || it.has("to")) m.setValidTo(time(in.to(), w + ".to"));
        if (created || it.has("admin")) m.setAdmin(Boolean.TRUE.equals(in.admin()));
        if (created || it.has("source")) m.setSource(SocialMediaService.source(in.source()));
        memberRepo.save(m);
        c.count("chatMembers", created ? "created" : "updated");
    }

    private ChatArchive archive(String keyOrId, UUID id, String where) {
        if (id != null) return archiveRepo.findById(id).orElseThrow(() -> new ImportException(400, where + ": no archive " + id));
        if (blank(keyOrId)) return null;
        String k = keyOrId.trim();
        try {
            UUID u = UUID.fromString(k);
            Optional<ChatArchive> byId = archiveRepo.findById(u);
            if (byId.isPresent()) return byId.get();
        } catch (IllegalArgumentException ignored) { /* a key, not an id */ }
        List<ChatArchive> hits = archiveRepo.findByExternalKey(k);
        if (hits.isEmpty()) throw new ImportException(400, where + ": no archive " + k);
        if (hits.size() > 1) throw new ImportException(400, where + ": " + hits.size() + " archives have the key " + k + " — give archiveId");
        return hits.get(0);
    }

    // ── References ───────────────────────────────────────────────────────────

    /** A profile by key, or a stub made for a bare name; null when neither is given. */
    private SocialProfile ref(String key, String name, SocialProfile.Platform platform, String where, Ctx c) {
        if (!blank(key)) return profileByKey(key, where, c);
        if (!blank(name)) return stub(name, platform == null ? SocialProfile.Platform.FACEBOOK : platform, c);
        return null;
    }

    private SocialProfile profileByKey(String key, String where, Ctx c) {
        if (blank(key)) return null;
        String k = key.trim();
        SocialProfile p = c.profiles.get(k);
        if (p == null) p = profileRepo.findByExternalKey(k).orElseThrow(() -> new ImportException(400, where + ": unknown profile " + k));
        c.profiles.put(k, p);
        return p;
    }

    /** The platform of the profile a key points at (stubs made beside it go on the same network). */
    private SocialProfile.Platform platformOf(String key, Ctx c) {
        if (blank(key)) return SocialProfile.Platform.FACEBOOK;
        SocialProfile p = c.profiles.get(key.trim());
        if (p == null) p = profileRepo.findByExternalKey(key.trim()).orElse(null);
        return p == null ? SocialProfile.Platform.FACEBOOK : p.getPlatform();
    }

    /** A profile that is only a name: "stub:<platform>:<name slug>". Made once, found again after. */
    private SocialProfile stub(String name, SocialProfile.Platform platform, Ctx c) {
        String n = name.trim();
        String key = "stub:" + platform.name().toLowerCase(Locale.ROOT) + ":" + SlugUtil.slugify(n);
        SocialProfile p = c.profiles.get(key);
        if (p == null) p = profileRepo.findByExternalKey(key).orElse(null);
        if (p == null) {
            p = new SocialProfile();
            p.setExternalKey(key);
            p.setPlatform(platform);
            p.setKind(SocialProfile.Kind.USER);
            p.setLevel(SocialProfile.Level.STUB);
            p.setName(cut(n, 255));
            p = profileRepo.save(p);
            c.stubs.put(n, key);
            c.count("profiles", "stubs");
        }
        c.profiles.put(key, p);
        return p;
    }

    private MediaFile media(String key, String where, Ctx c) {
        String k = key.trim();
        SocialMediaItem m = c.media.get(k);
        if (m == null) m = itemRepo.findByExternalKey(k).orElseThrow(() -> new ImportException(400, where + ": unknown media " + k + " (upload it to /api/social/media first)"));
        c.media.put(k, m);
        return m.getMediaFile();
    }

    private Person person(String slug, UUID id, String where) {
        if (id != null) return personRepo.findById(id).orElseThrow(() -> new ImportException(400, where + ": no person " + id));
        if (blank(slug)) return null;
        return personRepo.findBySlug(slug.trim()).orElseThrow(() -> new ImportException(400, where + ": no person with slug " + slug));
    }

    // ── Reading back in the shape it was written ─────────────────────────────

    /** A profile as a ProfileIn would write it (times in Vietnam wall-clock with their offset), to edit and send back. */
    @Transactional(readOnly = true)
    public Map<String, Object> rawProfile(String key) {
        SocialProfile p = profileRepo.findByExternalKey(key.trim()).orElseThrow(() -> new ImportException(404, "no profile " + key));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("key", p.getExternalKey());
        out.put("platform", p.getPlatform().name());
        out.put("kind", p.getKind().name());
        out.put("level", p.getLevel().name());
        out.put("person", p.getPerson() == null ? null : p.getPerson().getSlug());
        out.put("personId", p.getPerson() == null ? null : p.getPerson().getId());
        out.put("name", p.getName());
        out.put("handle", p.getHandle());
        out.put("platformId", p.getPlatformId());
        out.put("gender", p.getGender() == null ? null : p.getGender().name());
        out.put("joinedAt", vn(p.getJoinedAt()));
        out.put("closedAt", vn(p.getClosedAt()));
        out.put("privacy", p.getPrivacy() == null ? null : p.getPrivacy().name());
        out.put("category", p.getCategory());
        out.put("verified", p.getVerified());
        out.put("declaredCount", p.getDeclaredCount());
        out.put("chatArchive", p.getChatArchive() == null ? null : p.getChatArchive().getId().toString());
        out.put("source", p.getSource().name());
        out.put("note", p.getNote());
        out.put("names", nameRepo.findByProfileId(p.getId()).stream().map(n -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", n.getExternalKey()); m.put("name", n.getName()); m.put("from", vn(n.getValidFrom())); m.put("to", vn(n.getValidTo()));
            m.put("source", n.getSource().name());
            return m;
        }).toList());
        Map<UUID, String> keys = new HashMap<>();
        List<SocialProfileImage> imgs = imageRepo.findByProfileId(p.getId());
        if (!imgs.isEmpty()) for (Object[] r : itemRepo.keysOf(imgs.stream().map(i -> i.getMediaFile().getId()).toList())) keys.put((UUID) r[0], (String) r[1]);
        out.put("images", imgs.stream().map(i -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", i.getExternalKey()); m.put("kind", i.getKind().name()); m.put("media", keys.get(i.getMediaFile().getId()));
            m.put("from", vn(i.getValidFrom())); m.put("to", vn(i.getValidTo())); m.put("isDefault", i.isDefault());
            m.put("focusX", i.getFocusX()); m.put("focusY", i.getFocusY()); m.put("announce", i.getPost() != null);
            m.put("caption", i.getPost() == null ? null : i.getPost().getText());
            m.put("audience", i.getPost() == null || i.getPost().getAudience() == null ? null : i.getPost().getAudience().name());
            m.put("source", i.getSource().name());
            return m;
        }).toList());
        out.put("details", detailRepo.findByProfileId(p.getId()).stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", d.getExternalKey()); m.put("kind", d.getKind().name()); m.put("title", d.getTitle()); m.put("subtitle", d.getSubtitle());
            m.put("body", d.getBody()); m.put("related", d.getRelated() == null ? null : d.getRelated().getExternalKey());
            m.put("start", date(d.getStartDate(), d.getDatePrecision())); m.put("end", date(d.getEndDate(), d.getDatePrecision()));
            m.put("precision", d.getDatePrecision() == null ? null : d.getDatePrecision().name());
            m.put("from", vn(d.getValidFrom())); m.put("to", vn(d.getValidTo())); m.put("order", d.getSortOrder()); m.put("source", d.getSource().name());
            return m;
        }).toList());
        out.put("connections", connectionRepo.allOf(p.getId()).stream().map(x -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", x.getExternalKey()); m.put("kind", x.getKind().name()); m.put("from", x.getFrom().getExternalKey()); m.put("to", x.getTo().getExternalKey());
            m.put("since", vn(x.getValidFrom())); m.put("until", vn(x.getValidTo())); m.put("source", x.getSource().name());
            return m;
        }).toList());
        return out;
    }

    /** A post as a PostIn would write it, with its comments and reactions as CommentIn / ReactionIn. */
    @Transactional(readOnly = true)
    public Map<String, Object> rawPost(String key) {
        SocialPost p = postRepo.findByExternalKey(key.trim()).orElseThrow(() -> new ImportException(404, "no post " + key));
        Map<UUID, String> keys = new HashMap<>();
        List<UUID> files = new ArrayList<>();
        p.getMedia().forEach(pm -> files.add(pm.getMediaFile().getId()));
        if (p.getCover() != null) files.add(p.getCover().getId());
        List<SocialComment> comments = em.createQuery("SELECT c FROM SocialComment c WHERE c.post.id = :id ORDER BY c.postedAt, c.id", SocialComment.class)
            .setParameter("id", p.getId()).getResultList();
        comments.forEach(x -> { if (x.getMediaFile() != null) files.add(x.getMediaFile().getId()); });
        if (!files.isEmpty()) for (Object[] r : itemRepo.keysOf(files)) keys.put((UUID) r[0], (String) r[1]);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("key", p.getExternalKey()); out.put("kind", p.getKind().name());
        out.put("author", p.getAuthor().getExternalKey()); out.put("wall", p.getWall().getExternalKey());
        out.put("album", p.getAlbum() == null ? null : p.getAlbum().getExternalKey());
        out.put("sharedPost", p.getSharedPost() == null ? null : p.getSharedPost().getExternalKey());
        out.put("journalNoteId", p.getJournalNote() == null ? null : p.getJournalNote().getId());
        out.put("title", p.getTitle()); out.put("text", p.getText()); out.put("body", p.getBody());
        out.put("cover", p.getCover() == null ? null : keys.get(p.getCover().getId()));
        out.put("postedAt", vn(p.getPostedAt())); out.put("precision", p.getPostedPrecision() == null ? null : p.getPostedPrecision().name());
        out.put("editedAt", vn(p.getEditedAt())); out.put("audience", p.getAudience() == null ? null : p.getAudience().name());
        out.put("activity", p.getActivity()); out.put("activityIcon", p.getActivityIcon());
        out.put("placeName", p.getPlaceName()); out.put("place", p.getPlace() == null ? null : p.getPlace().getExternalKey());
        out.put("eventDate", vn(p.getEventDate())); out.put("eventPrecision", p.getEventPrecision() == null ? null : p.getEventPrecision().name());
        if (p.getLinkUrl() != null) {
            Map<String, Object> l = new LinkedHashMap<>();
            l.put("url", p.getLinkUrl()); l.put("title", p.getLinkTitle()); l.put("description", p.getLinkDescription()); l.put("imageUrl", p.getLinkImageUrl());
            out.put("link", l);
        } else out.put("link", null);
        out.put("media", p.getMedia().stream().map(pm -> { Map<String, Object> m = new LinkedHashMap<>(); m.put("media", keys.get(pm.getMediaFile().getId())); m.put("caption", pm.getCaption()); return m; }).toList());
        out.put("tags", p.getTags().stream().sorted(Comparator.comparing(SocialPostTag::getPosition, Comparator.nullsLast(Comparator.naturalOrder())))
            .map(x -> x.getProfile().getExternalKey()).toList());
        out.put("likeCount", p.getLikeCount()); out.put("commentCount", p.getCommentCount()); out.put("shareCount", p.getShareCount());
        out.put("pinned", p.getPinned()); out.put("originArchiveId", p.getOriginArchiveId()); out.put("originSeq", p.getOriginSeq());
        out.put("source", p.getSource().name()); out.put("note", p.getNote());
        out.put("comments", comments.stream().map(x -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", x.getExternalKey()); m.put("post", p.getExternalKey());
            m.put("media", x.getPostMedia() == null ? null : keys.get(x.getPostMedia().getMediaFile().getId()));
            m.put("parent", x.getParent() == null ? null : x.getParent().getExternalKey()); m.put("author", x.getAuthor().getExternalKey());
            m.put("text", x.getText()); m.put("attachment", x.getMediaFile() == null ? null : keys.get(x.getMediaFile().getId()));
            m.put("postedAt", vn(x.getPostedAt())); m.put("precision", x.getPostedPrecision() == null ? null : x.getPostedPrecision().name());
            m.put("editedAt", vn(x.getEditedAt())); m.put("likeCount", x.getLikeCount()); m.put("source", x.getSource().name());
            return m;
        }).toList());
        List<SocialReaction> reactions = em.createQuery("SELECT r FROM SocialReaction r WHERE r.post.id = :id ORDER BY r.reactedAt NULLS FIRST", SocialReaction.class)
            .setParameter("id", p.getId()).getResultList();
        out.put("reactions", reactions.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", r.getExternalKey()); m.put("post", r.getComment() == null ? p.getExternalKey() : null);
            m.put("comment", r.getComment() == null ? null : r.getComment().getExternalKey());
            m.put("media", r.getPostMedia() == null ? null : keys.get(r.getPostMedia().getMediaFile().getId()));
            m.put("profile", r.getProfile().getExternalKey()); m.put("type", r.getType().name()); m.put("at", vn(r.getReactedAt()));
            m.put("source", r.getSource().name());
            return m;
        }).toList());
        return out;
    }

    /** How much there is, and the owner's profile on each platform. */
    @Transactional(readOnly = true)
    public Map<String, Object> status() {
        Map<String, Object> out = new LinkedHashMap<>();
        Map<String, Long> profiles = new LinkedHashMap<>();
        for (Object[] r : profileRepo.countByKindAndLevel()) profiles.put(r[0] + "/" + r[1], ((Number) r[2]).longValue());
        out.put("profiles", profiles);
        for (String[] t : new String[][]{{"names", "SocialProfileName"}, {"images", "SocialProfileImage"}, {"details", "SocialProfileDetail"},
            {"albums", "SocialAlbum"}, {"media", "SocialMediaItem"}, {"posts", "SocialPost"}, {"comments", "SocialComment"},
            {"reactions", "SocialReaction"}, {"connections", "SocialConnection"}, {"chatMembers", "SocialChatMember"}})
            out.put(t[0], em.createQuery("SELECT COUNT(x) FROM " + t[1] + " x", Long.class).getSingleResult());
        Map<String, String> self = new LinkedHashMap<>();
        for (SocialProfile.Platform pl : SocialProfile.Platform.values())
            profileRepo.findSelf(pl).stream().findFirst().ifPresent(p -> self.put(pl.name(), p.getExternalKey()));
        out.put("self", self);
        return out;
    }

    /** Keys stored under a prefix (profiles or posts), to see what is there before writing. */
    @Transactional(readOnly = true)
    public List<String> keys(String type, String prefix) {
        String like = (prefix == null ? "" : prefix.replace("%", "\\%").replace("_", "\\_")) + "%";
        return switch (type) {
            case "profiles" -> profileRepo.keysLike(like);
            case "posts" -> postRepo.keysLike(like);
            default -> throw new ImportException(404, "keys of " + type + ": only profiles and posts");
        };
    }

    private static String vn(LocalDateTime utc) {
        return utc == null ? null : utc.atOffset(java.time.ZoneOffset.UTC).atZoneSameInstant(SocialTime.VN).toOffsetDateTime().toString();
    }

    private static String date(java.time.LocalDate d, DatePrecision p) {
        if (d == null) return null;
        if (p == DatePrecision.YEAR || p == DatePrecision.DECADE) return String.valueOf(d.getYear());
        if (p == DatePrecision.MONTH || p == DatePrecision.SEASON) return d.toString().substring(0, 7);
        return d.toString();
    }

    // ── Small things ─────────────────────────────────────────────────────────

    private static SocialTime.Moment moment(String s, String where) {
        try { return SocialTime.parse(s); }
        catch (IllegalArgumentException e) { throw new ImportException(400, where + ": " + e.getMessage()); }
    }

    private static LocalDateTime time(String s, String where) {
        SocialTime.Moment m = moment(s, where);
        return m == null ? null : m.utc();
    }

    private static <E extends Enum<E>> E enumOf(Class<E> type, String v, E dflt, String where) {
        if (blank(v)) return dflt;
        try { return Enum.valueOf(type, v.trim().toUpperCase(Locale.ROOT).replace(' ', '_').replace('-', '_')); }
        catch (IllegalArgumentException e) {
            throw new ImportException(400, where + ": " + v + " is not one of " + Arrays.toString(type.getEnumConstants()));
        }
    }

    static boolean blank(String s) { return s == null || s.isBlank(); }

    static String trim(String s) { return blank(s) ? null : s.trim(); }

    static String cut(String s, int max) { return s == null || s.length() <= max ? s : s.substring(0, max); }

    static String firstNonBlank(String... v) {
        for (String s : v) if (!blank(s)) return s.trim();
        return null;
    }
}
