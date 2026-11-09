package com.sonic.angels.service;

import com.sonic.angels.model.dto.ChatAttachmentDto;
import com.sonic.angels.model.dto.SocialDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import com.sonic.angels.util.SocialTime;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.Collection;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Conversations read at a moment T, for every chat app whose history is in chat_archives: Facebook Messenger, Yahoo,
 * SMS, Zalo (the 2017 Facebook wall pages, "fbwall:…", are not conversations). Who is behind each sender name comes
 * from social_chat_members; without a row, the owner's own messages are his profile on that platform, the other side
 * of a two-person chat is the profile of the person the archive belongs to, and any other name is matched against the
 * names profiles of that platform went by when only one fits. Names and pictures are shown as they were at T.
 */
@Service
@Transactional(readOnly = true)
public class SocialMessengerService {

    private static final long GROUP_CACHE_MS = 10 * 60_000L;
    private static final long ONLINE_MINUTES = 30;
    private static final String DEFAULT_GROUP = "Friends";
    private static final Map<String, String> SENT = Map.of(
        "PHOTO", "sent a photo.", "VIDEO", "sent a video.", "STICKER", "sent a sticker.", "AUDIO", "sent a voice message.",
        "FILE", "sent a file.", "GIF", "sent a GIF.");
    private static final Set<ChatArchive.Platform> CHAT_APPS = EnumSet.of(
        ChatArchive.Platform.FACEBOOK, ChatArchive.Platform.YAHOO, ChatArchive.Platform.SMS, ChatArchive.Platform.ZALO);

    private final SocialReadService reads;
    private final ChatArchiveRepository archiveRepo;
    private final ChatMessageRepository messageRepo;
    private final ChatAttachmentRepository attachmentRepo;
    private final SocialChatMemberRepository memberRepo;
    private final SocialProfileRepository profileRepo;
    private final SocialProfileNameRepository nameRepo;
    private final SocialConnectionRepository connectionRepo;
    private final SocialProfileDetailRepository detailRepo;

    /** Per chat app: archive id → how many people other than the owner wrote in it (cached a while). */
    private final Map<ChatArchive.Platform, Map<UUID, Integer>> otherSenders = new ConcurrentHashMap<>();
    private final Map<ChatArchive.Platform, Long> otherSendersAt = new ConcurrentHashMap<>();

    public SocialMessengerService(SocialReadService reads, ChatArchiveRepository archiveRepo, ChatMessageRepository messageRepo,
                                  ChatAttachmentRepository attachmentRepo, SocialChatMemberRepository memberRepo,
                                  SocialProfileRepository profileRepo, SocialProfileNameRepository nameRepo,
                                  SocialConnectionRepository connectionRepo, SocialProfileDetailRepository detailRepo) {
        this.reads = reads;
        this.archiveRepo = archiveRepo;
        this.messageRepo = messageRepo;
        this.attachmentRepo = attachmentRepo;
        this.memberRepo = memberRepo;
        this.profileRepo = profileRepo;
        this.nameRepo = nameRepo;
        this.connectionRepo = connectionRepo;
        this.detailRepo = detailRepo;
    }

    /** The social platform whose profiles stand behind a chat app's senders. */
    public static SocialProfile.Platform platformOf(ChatArchive.Platform p) {
        if (p == null) return SocialProfile.Platform.FACEBOOK;
        return switch (p) {
            case YAHOO -> SocialProfile.Platform.YAHOO;
            case SMS -> SocialProfile.Platform.SMS;
            case ZALO -> SocialProfile.Platform.ZALO;
            default -> SocialProfile.Platform.FACEBOOK;
        };
    }

    /** "yahoo" / "YAHOO" → the chat app; nothing given = Facebook. */
    public static ChatArchive.Platform chatApp(String s) {
        if (s == null || s.isBlank()) return ChatArchive.Platform.FACEBOOK;
        try {
            ChatArchive.Platform p = ChatArchive.Platform.valueOf(s.trim().toUpperCase(Locale.ROOT));
            if (!CHAT_APPS.contains(p)) throw new IllegalArgumentException();
            return p;
        } catch (IllegalArgumentException e) {
            throw new ImportException(400, "platform must be one of " + CHAT_APPS);
        }
    }

    // ── What is known about a set of conversations ───────────────────────────

    private final class Threads {
        final ChatArchive.Platform app;
        final SocialProfile.Platform platform;
        final SocialReadService.View v;
        final Map<UUID, List<SocialChatMember>> members;
        final Map<UUID, SocialProfile> chatProfiles = new HashMap<>();
        final Map<UUID, SocialProfile> personProfile = new HashMap<>();
        Map<String, Set<UUID>> byName;

        Threads(ChatArchive.Platform app, LocalDateTime t, List<ChatArchive> archives) {
            this.app = app;
            this.platform = platformOf(app);
            this.v = reads.view(t, platform);
            List<UUID> ids = archives.stream().map(ChatArchive::getId).toList();
            members = ids.isEmpty() ? Map.of() : memberRepo.findByArchiveIdIn(ids).stream()
                .collect(Collectors.groupingBy(m -> m.getArchive().getId()));
            if (!ids.isEmpty()) profileRepo.findByChatArchiveIdIn(ids).forEach(p -> chatProfiles.put(p.getChatArchive().getId(), p));
            Set<UUID> persons = archives.stream().filter(a -> a.getPerson() != null).map(a -> a.getPerson().getId()).collect(Collectors.toSet());
            if (!persons.isEmpty()) {
                Map<UUID, List<SocialProfile>> of = profileRepo.findUsersOfPersons(platform, persons).stream()
                    .collect(Collectors.groupingBy(p -> p.getPerson().getId()));
                of.forEach((person, ps) -> { if (ps.size() == 1) personProfile.put(person, ps.get(0)); });
            }
            List<SocialProfile> known = new ArrayList<>(chatProfiles.values());
            known.addAll(personProfile.values());
            members.values().forEach(l -> l.forEach(m -> known.add(m.getProfile())));
            if (v.me != null) known.add(v.me);
            v.preload(known);
        }

        /** More than one other account wrote in it (two names of one account are one; a Yahoo conference is many). */
        boolean group(ChatArchive a) {
            if (chatProfiles.containsKey(a.getId())) return true;
            Set<UUID> accounts = new HashSet<>(), persons = new HashSet<>();
            Set<String> named = new HashSet<>();
            boolean unowned = false;
            for (SocialChatMember m : members.getOrDefault(a.getId(), List.of())) {
                SocialProfile p = m.getProfile();
                if (v.me != null && p.getId().equals(v.me.getId())) continue;
                accounts.add(p.getId());
                named.add(m.getSenderName());
                if (p.getPerson() != null) persons.add(p.getPerson().getId()); else unowned = true;
            }
            // two accounts of the same person in one conversation is still a talk with her
            if (accounts.size() > 1 && (unowned || persons.size() > 1)) return true;
            // a conversation filed under one person is with that person, even when an export wrote her under two names
            if (a.getPerson() != null) return false;
            int others = otherSenderCounts(app).getOrDefault(a.getId(), 0);
            // every name the other side wrote under belongs to one account (a name she changed): a talk with that one
            if (accounts.size() == 1 && named.size() >= others) return false;
            return others > 1;
        }

        /** The other side of a two-person chat. */
        SocialProfile counterpart(ChatArchive a) {
            for (SocialChatMember m : members.getOrDefault(a.getId(), List.of()))
                if (v.me == null || !m.getProfile().getId().equals(v.me.getId())) return m.getProfile();
            return a.getPerson() == null ? null : personProfile.get(a.getPerson().getId());
        }

        /** The row of a sender name whose period covers the moment; else any row of that name. */
        SocialChatMember member(ChatArchive a, String sender, LocalDateTime at) {
            SocialChatMember any = null;
            for (SocialChatMember m : members.getOrDefault(a.getId(), List.of())) {
                if (!m.getSenderName().equals(sender)) continue;
                if (any == null) any = m;
                if (at != null && (m.getValidFrom() == null || !m.getValidFrom().isAfter(at)) && (m.getValidTo() == null || m.getValidTo().isAfter(at))) return m;
            }
            return any;
        }

        SocialProfile sender(ChatArchive a, String sender, String type, LocalDateTime at, boolean group) {
            if ("SELF".equals(type)) return v.me;
            SocialChatMember m = member(a, sender, at);
            if (m != null) return m.getProfile();
            if (!group) { SocialProfile c = counterpart(a); if (c != null) return c; }
            return byName(sender);
        }

        /** A profile that is the only one to have gone by this name. */
        SocialProfile byName(String sender) {
            if (sender == null || sender.isBlank()) return null;
            if (byName == null) {
                byName = new HashMap<>();
                for (Object[] r : profileRepo.namesOf(platform)) byName.computeIfAbsent(SocialReadService.fold((String) r[1]), k -> new HashSet<>()).add((UUID) r[0]);
                for (Object[] r : nameRepo.namesOf(platform)) byName.computeIfAbsent(SocialReadService.fold((String) r[1]), k -> new HashSet<>()).add((UUID) r[0]);
            }
            Set<UUID> ids = byName.get(SocialReadService.fold(sender));
            if (ids == null || ids.size() != 1) return null;
            SocialProfile p = profileRepo.findById(ids.iterator().next()).orElse(null);
            return p != null && p.getKind() == SocialProfile.Kind.USER ? p : null;
        }

        String title(ChatArchive a, boolean group) {
            SocialProfile chat = chatProfiles.get(a.getId());
            if (chat != null) return v.ref(chat).name();
            if (!group) {
                SocialProfile c = counterpart(a);
                if (c != null) return v.ref(c).name();
                if (a.getPerson() != null) return firstNonBlank(a.getPerson().getDisplayName(), a.getPerson().getName());
            }
            String raw = firstNonBlank(a.getTitle(), a.getCounterpart(), "Conversation");
            return raw.replaceFirst("^(Facebook|Yahoo|SMS|Zalo) · ", "").replaceFirst("^Nhóm: ", "");
        }

        List<SocialDto.Ref> faces(ChatArchive a, boolean group, String title) {
            SocialProfile chat = chatProfiles.get(a.getId());
            if (chat != null && v.ref(chat).avatarUrl() != null) return List.of(v.ref(chat));
            if (!group) {
                SocialProfile c = counterpart(a);
                return List.of(c != null ? v.ref(c) : bare(title, platform));
            }
            List<SocialDto.Ref> out = new ArrayList<>();
            for (SocialChatMember m : members.getOrDefault(a.getId(), List.of())) {
                if (v.me != null && m.getProfile().getId().equals(v.me.getId())) continue;
                SocialDto.Ref r = v.ref(m.getProfile());
                if (out.stream().noneMatch(x -> Objects.equals(x.id(), r.id()))) out.add(r);
                if (out.size() == 2) break;
            }
            if (out.isEmpty()) out.add(bare(title, platform));
            return out;
        }
    }

    private static SocialDto.Ref bare(String name, SocialProfile.Platform platform) {
        return new SocialDto.Ref(null, null, null, platform.name(), "USER", "active", name, null, null, false);
    }

    private Map<UUID, Integer> otherSenderCounts(ChatArchive.Platform app) {
        Long at = otherSendersAt.get(app);
        if (at != null && System.currentTimeMillis() - at < GROUP_CACHE_MS) return otherSenders.getOrDefault(app, Map.of());
        List<UUID> ids = archiveRepo.threadsOf(app).stream().map(ChatArchive::getId).toList();
        Map<UUID, Integer> m = new HashMap<>();
        if (!ids.isEmpty()) for (Object[] r : messageRepo.otherSenderCounts(ids)) m.put((UUID) r[0], ((Number) r[1]).intValue());
        otherSenders.put(app, m);
        otherSendersAt.put(app, System.currentTimeMillis());
        return m;
    }

    // ── The inbox ────────────────────────────────────────────────────────────

    public List<SocialDto.Thread> threads(LocalDateTime t, String q) { return threads(ChatArchive.Platform.FACEBOOK, t, q); }

    public List<SocialDto.Thread> threads(ChatArchive.Platform app, LocalDateTime t, String q) {
        List<ChatArchive> archives = archiveRepo.threadsOf(app);
        if (archives.isEmpty()) return List.of();
        Map<UUID, Object[]> last = new HashMap<>();
        for (Object[] r : messageRepo.lastVisibleBy(archives.stream().map(ChatArchive::getId).toList(), t)) last.put((UUID) r[0], r);
        List<ChatArchive> live = archives.stream().filter(a -> last.containsKey(a.getId())).toList();
        Threads th = new Threads(app, t, live);
        String needle = SocialReadService.fold(q);
        List<SocialDto.Thread> out = new ArrayList<>();
        for (ChatArchive a : live) {
            boolean group = th.group(a);
            String title = th.title(a, group);
            if (!needle.isEmpty() && !SocialReadService.fold(title).contains(needle)) continue;
            Object[] r = last.get(a.getId());
            String type = (String) r[3], kind = (String) r[4], content = (String) r[5];
            boolean fromMe = "SELF".equals(type);
            String sender = fromMe ? "You" : group ? senderName(th, a, (String) r[2], type, SocialTime.fromDb(r[6]), group) : null;
            String text = content != null && !content.isBlank() ? content : SENT.getOrDefault(kind, "");
            SocialProfile c = group ? null : th.counterpart(a);
            out.add(new SocialDto.Thread(a.getId(), title, group, th.faces(a, group, title), c == null ? null : th.v.ref(c),
                new SocialDto.LastMessage(sender, fromMe, text, kind, SocialTime.fromDb(r[6])),
                a.getMessageCount() == null ? 0 : a.getMessageCount()));
        }
        out.sort(Comparator.comparing((SocialDto.Thread x) -> x.last().at(), Comparator.nullsLast(Comparator.reverseOrder())));
        return out;
    }

    /** How the inbox names who wrote last: the nickname set for them in that chat, else their name at the moment. */
    private static String senderName(Threads th, ChatArchive a, String sender, String type, LocalDateTime at, boolean group) {
        SocialChatMember m = th.member(a, sender, at);
        if (m != null && m.getNickname() != null && !m.getNickname().isBlank()) return m.getNickname();
        SocialProfile p = th.sender(a, sender, type, at, group);
        return p != null ? th.v.ref(p).name() : sender;
    }

    // ── A buddy list (Yahoo and the like) ────────────────────────────────────

    /**
     * The contact list of a chat app at T. Contacts come from my links on that platform (with the group they sat in)
     * and from every conversation already started by T; a contact counts as online when a message went either way
     * within half an hour of the moment, which is what the list would have shown that evening.
     */
    public SocialDto.BuddyList buddies(ChatArchive.Platform app, LocalDateTime t) {
        List<ChatArchive> archives = archiveRepo.threadsOf(app);
        Map<UUID, Object[]> last = new HashMap<>();
        if (!archives.isEmpty())
            for (Object[] r : messageRepo.lastVisibleBy(archives.stream().map(ChatArchive::getId).toList(), t)) last.put((UUID) r[0], r);
        List<ChatArchive> live = archives.stream().filter(a -> last.containsKey(a.getId())).toList();
        Threads th = new Threads(app, t, live);
        Set<UUID> online = live.isEmpty() ? Set.of() : new HashSet<>(messageRepo.activeBetween(
            live.stream().map(ChatArchive::getId).toList(), t.minusMinutes(ONLINE_MINUTES), t.plusMinutes(ONLINE_MINUTES)));

        // the group of each contact, from my links that stand at T
        Map<UUID, String> labelOf = new HashMap<>();
        Map<UUID, SocialProfile> linked = new LinkedHashMap<>();
        if (th.v.me != null)
            for (SocialConnection c : connectionRepo.from(th.v.me.getId(), List.of(SocialConnection.Kind.FRIEND), t)) {
                linked.put(c.getTo().getId(), c.getTo());
                if (c.getLabel() != null && !c.getLabel().isBlank()) labelOf.put(c.getTo().getId(), c.getLabel().trim());
            }
        th.v.preload(new ArrayList<>(linked.values()));

        // one row per contact: a linked profile, a two-person conversation, or both joined
        Map<String, SocialDto.Buddy> rows = new LinkedHashMap<>();
        Map<String, String> groupOf = new HashMap<>();
        for (ChatArchive a : live) {
            if (th.group(a)) continue;
            SocialProfile c = th.counterpart(a);
            Object[] r = last.get(a.getId());
            String key = c != null ? c.getId().toString() : "a:" + a.getId();
            SocialDto.Ref ref = c != null ? th.v.ref(c) : bare(th.title(a, false), th.platform);
            SocialDto.Buddy prev = rows.get(key);
            LocalDateTime lastAt = SocialTime.fromDb(r[6]);
            if (prev != null && prev.lastAt() != null && lastAt != null && prev.lastAt().isAfter(lastAt)) continue;   // the busier thread wins
            rows.put(key, new SocialDto.Buddy(ref, ref.name(), a.getId(), null, online.contains(a.getId()), lastAt,
                a.getMessageCount() == null ? 0 : a.getMessageCount()));
            groupOf.put(key, c != null ? labelOf.getOrDefault(c.getId(), DEFAULT_GROUP) : DEFAULT_GROUP);
        }
        for (SocialProfile p : linked.values()) {
            String key = p.getId().toString();
            if (rows.containsKey(key)) continue;
            SocialDto.Ref ref = th.v.ref(p);
            if (!"active".equals(ref.state())) continue;
            rows.put(key, new SocialDto.Buddy(ref, ref.name(), null, null, false, null, 0));
            groupOf.put(key, labelOf.getOrDefault(p.getId(), DEFAULT_GROUP));
        }

        // status lines at T, mine included
        Set<UUID> ids = new HashSet<>();
        rows.values().forEach(b -> { if (b.ref().id() != null) ids.add(b.ref().id()); });
        if (th.v.me != null) ids.add(th.v.me.getId());
        Map<UUID, String> status = statusAt(ids, t);

        Map<String, List<SocialDto.Buddy>> byGroup = new TreeMap<>(Comparator.comparing((String g) -> g.equals(DEFAULT_GROUP)).thenComparing(String.CASE_INSENSITIVE_ORDER));
        rows.forEach((k, b) -> byGroup.computeIfAbsent(groupOf.get(k), x -> new ArrayList<>())
            .add(b.ref().id() == null ? b : new SocialDto.Buddy(b.ref(), b.name(), b.archiveId(), status.get(b.ref().id()), b.online(), b.lastAt(), b.messages())));
        List<SocialDto.BuddyGroup> groups = new ArrayList<>();
        byGroup.forEach((g, list) -> {
            list.sort(Comparator.comparing((SocialDto.Buddy b) -> !b.online()).thenComparing(b -> SocialReadService.fold(b.name())));
            groups.add(new SocialDto.BuddyGroup(g, (int) list.stream().filter(SocialDto.Buddy::online).count(), list));
        });
        SocialDto.Ref me = th.v.me == null ? null : th.v.ref(th.v.me);
        return new SocialDto.BuddyList(me, th.v.me == null ? null : status.get(th.v.me.getId()), groups, t);
    }

    /** The status line each profile showed at T (the latest one started by then). */
    private Map<UUID, String> statusAt(Collection<UUID> ids, LocalDateTime t) {
        Map<UUID, SocialProfileDetail> best = new HashMap<>();
        if (ids.isEmpty()) return Map.of();
        for (SocialProfileDetail d : detailRepo.findByProfileIdInAndKind(ids, SocialProfileDetail.Kind.STATUS)) {
            if (d.getValidFrom() != null && d.getValidFrom().isAfter(t)) continue;
            if (d.getValidTo() != null && !d.getValidTo().isAfter(t)) continue;
            SocialProfileDetail cur = best.get(d.getProfile().getId());
            if (cur == null || (d.getValidFrom() != null && (cur.getValidFrom() == null || d.getValidFrom().isAfter(cur.getValidFrom()))))
                best.put(d.getProfile().getId(), d);
        }
        Map<UUID, String> out = new HashMap<>();
        best.forEach((id, d) -> out.put(id, firstNonBlank(d.getTitle(), d.getBody())));
        return out;
    }

    // ── One conversation ─────────────────────────────────────────────────────

    public SocialDto.ThreadDetail thread(UUID archiveId, LocalDateTime t) {
        ChatArchive a = archive(archiveId);
        Threads th = new Threads(a.getPlatform(), t, List.of(a));
        boolean group = th.group(a);
        List<SocialDto.Member> members = new ArrayList<>();
        Map<UUID, SocialDto.Member> seen = new HashMap<>();
        LocalDateTime first = null;
        long count = messageRepo.countVisibleBy(a.getId(), ChatMessage.Kind.EMPTY, t);
        List<Object[]> senders = messageRepo.sendersOf(a.getId(), t);
        senders.sort(Comparator.comparing((Object[] r) -> ((Number) r[2]).longValue()).reversed());
        for (Object[] r : senders) {
            String sender = (String) r[0];
            ChatMessage.SenderType type = (ChatMessage.SenderType) r[1];
            LocalDateTime since = (LocalDateTime) r[3];
            if (since != null && (first == null || since.isBefore(first))) first = since;
            if (type == ChatMessage.SenderType.SYSTEM) continue;
            SocialProfile p = th.sender(a, sender, type.name(), t, group);
            SocialChatMember m = th.member(a, sender, t);
            int n = ((Number) r[2]).intValue();
            SocialDto.Ref ref = p != null ? th.v.ref(p) : bare(sender, th.platform);
            if (p != null && seen.containsKey(p.getId())) continue;   // one person under two names: counted once, by the busier name
            SocialDto.Member row = new SocialDto.Member(ref, sender, m == null ? null : m.getNickname(), m != null && Boolean.TRUE.equals(m.getAdmin()),
                type == ChatMessage.SenderType.SELF, n);
            if (p != null) seen.put(p.getId(), row);
            members.add(row);
        }
        String title = th.title(a, group);
        SocialProfile c = group ? null : th.counterpart(a);
        LocalDateTime lastAt = a.getDateTo() != null && a.getDateTo().isAfter(t) ? t : a.getDateTo();
        return new SocialDto.ThreadDetail(a.getId(), title, group, c == null ? null : th.v.ref(c), members, first, lastAt, count, t);
    }

    /** Messages up to T, newest page first; before = a seq to page further back. Items come oldest first. */
    public SocialDto.MessagePage messages(UUID archiveId, LocalDateTime t, Integer before, int size) {
        ChatArchive a = archive(archiveId);
        int n = size <= 0 ? 60 : Math.min(size, 200);
        List<ChatMessage> rows = new ArrayList<>(messageRepo.pageBefore(a.getId(), ChatMessage.Kind.EMPTY, t, before != null,
            before == null ? 0 : before, PageRequest.of(0, n + 1)));
        boolean more = rows.size() > n;
        if (more) rows = rows.subList(0, n);
        Collections.reverse(rows);
        Threads th = new Threads(a.getPlatform(), t, List.of(a));
        boolean group = th.group(a);
        Map<UUID, List<ChatAttachmentDto.Item>> atts = new HashMap<>();
        if (!rows.isEmpty())
            attachmentRepo.itemsOfMessages(a.getId(), rows.stream().map(ChatMessage::getId).toList()).stream()
                .map(ChatAttachmentDto.Item::of).forEach(i -> atts.computeIfAbsent(i.getMessageId(), k -> new ArrayList<>()).add(i));
        Map<String, SocialProfile> resolved = new HashMap<>();
        List<SocialDto.Message> out = new ArrayList<>(rows.size());
        for (ChatMessage m : rows) {
            String type = m.getSenderType() == null ? "PERSON" : m.getSenderType().name();
            SocialChatMember row = th.member(a, m.getSender(), m.getTimestamp());
            String cacheKey = type + "|" + m.getSender() + "|" + (row == null ? "" : row.getId());
            SocialProfile p = resolved.containsKey(cacheKey) ? resolved.get(cacheKey) : th.sender(a, m.getSender(), type, m.getTimestamp(), group);
            resolved.put(cacheKey, p);
            out.add(new SocialDto.Message(m.getId(), m.getSeq() == null ? 0 : m.getSeq(), m.getKind() == null ? "TEXT" : m.getKind().name(),
                m.getContent(), m.getTimestamp(), m.getTimePrecision() == null ? null : m.getTimePrecision().name(),
                "SELF".equals(type), "SYSTEM".equals(type), m.getSender(), p == null ? null : th.v.ref(p),
                row == null ? null : row.getNickname(), atts.getOrDefault(m.getId(), List.of()), reactionsOf(m.getReactions())));
        }
        return new SocialDto.MessagePage(out, more, out.isEmpty() ? null : out.get(0).seq());
    }

    private ChatArchive archive(UUID id) {
        ChatArchive a = archiveRepo.findById(id).orElseThrow(() -> new ImportException(404, "no conversation " + id));
        if (!CHAT_APPS.contains(a.getPlatform()) || (a.getExternalKey() != null && a.getExternalKey().startsWith("fbwall:")))
            throw new ImportException(404, "not a conversation of a chat app");
        return a;
    }

    /** "😍Mua Thu La · 😆Quốc Hưng" → (😍, Mua Thu La), (😆, Quốc Hưng). */
    static List<SocialDto.MessageReaction> reactionsOf(String s) {
        if (s == null || s.isBlank()) return List.of();
        List<SocialDto.MessageReaction> out = new ArrayList<>();
        for (String part : s.split(" · ")) {
            String x = part.trim();
            int i = 0;
            while (i < x.length()) {
                int cp = x.codePointAt(i);
                if (Character.isLetterOrDigit(cp)) break;
                i += Character.charCount(cp);
            }
            String emoji = x.substring(0, i).trim(), name = x.substring(i).trim();
            if (!emoji.isEmpty() || !name.isEmpty()) out.add(new SocialDto.MessageReaction(emoji.isEmpty() ? "👍" : emoji, name));
        }
        return out;
    }

    private static String firstNonBlank(String... v) {
        for (String s : v) if (s != null && !s.isBlank()) return s.trim();
        return null;
    }
}
