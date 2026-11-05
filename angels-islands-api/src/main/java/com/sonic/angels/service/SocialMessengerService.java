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
import java.util.stream.Collectors;

/**
 * Messenger read at a moment T, over the Facebook conversations already imported into chat_archives (the 2017 wall
 * pages, "fbwall:…", are not conversations). Who is behind each sender name comes from social_chat_members; without
 * a row, the owner's own messages are his profile, the other side of a two-person chat is the profile of the person
 * the archive belongs to, and any other name is matched against the names profiles went by when only one fits.
 * Names and pictures are shown as they were at T, the way Messenger shows everyone as they are now.
 */
@Service
@Transactional(readOnly = true)
public class SocialMessengerService {

    private static final long GROUP_CACHE_MS = 10 * 60_000L;
    private static final Map<String, String> SENT = Map.of(
        "PHOTO", "sent a photo.", "VIDEO", "sent a video.", "STICKER", "sent a sticker.", "AUDIO", "sent a voice message.",
        "FILE", "sent a file.", "GIF", "sent a GIF.");

    private final SocialReadService reads;
    private final ChatArchiveRepository archiveRepo;
    private final ChatMessageRepository messageRepo;
    private final ChatAttachmentRepository attachmentRepo;
    private final SocialChatMemberRepository memberRepo;
    private final SocialProfileRepository profileRepo;
    private final SocialProfileNameRepository nameRepo;

    private volatile Map<UUID, Integer> otherSenders = Map.of();
    private volatile long otherSendersAt;

    public SocialMessengerService(SocialReadService reads, ChatArchiveRepository archiveRepo, ChatMessageRepository messageRepo,
                                  ChatAttachmentRepository attachmentRepo, SocialChatMemberRepository memberRepo,
                                  SocialProfileRepository profileRepo, SocialProfileNameRepository nameRepo) {
        this.reads = reads;
        this.archiveRepo = archiveRepo;
        this.messageRepo = messageRepo;
        this.attachmentRepo = attachmentRepo;
        this.memberRepo = memberRepo;
        this.profileRepo = profileRepo;
        this.nameRepo = nameRepo;
    }

    // ── What is known about a set of conversations ───────────────────────────

    private final class Threads {
        final SocialReadService.View v;
        final Map<UUID, List<SocialChatMember>> members;
        final Map<UUID, SocialProfile> chatProfiles = new HashMap<>();
        final Map<UUID, SocialProfile> personProfile = new HashMap<>();
        Map<String, Set<UUID>> byName;

        Threads(SocialReadService.View v, List<ChatArchive> archives) {
            this.v = v;
            List<UUID> ids = archives.stream().map(ChatArchive::getId).toList();
            members = ids.isEmpty() ? Map.of() : memberRepo.findByArchiveIdIn(ids).stream()
                .collect(Collectors.groupingBy(m -> m.getArchive().getId()));
            if (!ids.isEmpty()) profileRepo.findByChatArchiveIdIn(ids).forEach(p -> chatProfiles.put(p.getChatArchive().getId(), p));
            Set<UUID> persons = archives.stream().filter(a -> a.getPerson() != null).map(a -> a.getPerson().getId()).collect(Collectors.toSet());
            if (!persons.isEmpty()) {
                Map<UUID, List<SocialProfile>> of = profileRepo.findUsersOfPersons(SocialProfile.Platform.FACEBOOK, persons).stream()
                    .collect(Collectors.groupingBy(p -> p.getPerson().getId()));
                of.forEach((person, ps) -> { if (ps.size() == 1) personProfile.put(person, ps.get(0)); });
            }
            List<SocialProfile> known = new ArrayList<>(chatProfiles.values());
            known.addAll(personProfile.values());
            members.values().forEach(l -> l.forEach(m -> known.add(m.getProfile())));
            if (v.me != null) known.add(v.me);
            v.preload(known);
        }

        boolean group(ChatArchive a) {
            if (chatProfiles.containsKey(a.getId())) return true;
            long people = members.getOrDefault(a.getId(), List.of()).stream()
                .filter(m -> v.me == null || !m.getProfile().getId().equals(v.me.getId())).map(SocialChatMember::getSenderName).distinct().count();
            return people > 1 || otherSenderCounts().getOrDefault(a.getId(), 0) > 1;
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
                for (Object[] r : profileRepo.namesOf(SocialProfile.Platform.FACEBOOK)) byName.computeIfAbsent(SocialReadService.fold((String) r[1]), k -> new HashSet<>()).add((UUID) r[0]);
                for (Object[] r : nameRepo.namesOf(SocialProfile.Platform.FACEBOOK)) byName.computeIfAbsent(SocialReadService.fold((String) r[1]), k -> new HashSet<>()).add((UUID) r[0]);
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
            return raw.replaceFirst("^Facebook · ", "").replaceFirst("^Nhóm: ", "");
        }

        List<SocialDto.Ref> faces(ChatArchive a, boolean group, String title) {
            SocialProfile chat = chatProfiles.get(a.getId());
            if (chat != null && v.ref(chat).avatarUrl() != null) return List.of(v.ref(chat));
            if (!group) {
                SocialProfile c = counterpart(a);
                return List.of(c != null ? v.ref(c) : bare(title));
            }
            List<SocialDto.Ref> out = new ArrayList<>();
            for (SocialChatMember m : members.getOrDefault(a.getId(), List.of())) {
                if (v.me != null && m.getProfile().getId().equals(v.me.getId())) continue;
                SocialDto.Ref r = v.ref(m.getProfile());
                if (out.stream().noneMatch(x -> Objects.equals(x.id(), r.id()))) out.add(r);
                if (out.size() == 2) break;
            }
            if (out.isEmpty()) out.add(bare(title));
            return out;
        }
    }

    private static SocialDto.Ref bare(String name) {
        return new SocialDto.Ref(null, null, null, "FACEBOOK", "USER", "active", name, null, null, false);
    }

    private Map<UUID, Integer> otherSenderCounts() {
        if (System.currentTimeMillis() - otherSendersAt < GROUP_CACHE_MS) return otherSenders;
        List<UUID> ids = archiveRepo.messengerThreads().stream().map(ChatArchive::getId).toList();
        Map<UUID, Integer> m = new HashMap<>();
        if (!ids.isEmpty()) for (Object[] r : messageRepo.otherSenderCounts(ids)) m.put((UUID) r[0], ((Number) r[1]).intValue());
        otherSenders = m;
        otherSendersAt = System.currentTimeMillis();
        return m;
    }

    // ── The inbox ────────────────────────────────────────────────────────────

    public List<SocialDto.Thread> threads(LocalDateTime t, String q) {
        List<ChatArchive> archives = archiveRepo.messengerThreads();
        if (archives.isEmpty()) return List.of();
        Map<UUID, Object[]> last = new HashMap<>();
        for (Object[] r : messageRepo.lastVisibleBy(archives.stream().map(ChatArchive::getId).toList(), t)) last.put((UUID) r[0], r);
        List<ChatArchive> live = archives.stream().filter(a -> last.containsKey(a.getId())).toList();
        Threads th = new Threads(reads.view(t, SocialProfile.Platform.FACEBOOK), live);
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

    // ── One conversation ─────────────────────────────────────────────────────

    public SocialDto.ThreadDetail thread(UUID archiveId, LocalDateTime t) {
        ChatArchive a = archive(archiveId);
        Threads th = new Threads(reads.view(t, SocialProfile.Platform.FACEBOOK), List.of(a));
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
            SocialDto.Ref ref = p != null ? th.v.ref(p) : bare(sender);
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
        Threads th = new Threads(reads.view(t, SocialProfile.Platform.FACEBOOK), List.of(a));
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
        if (a.getPlatform() != ChatArchive.Platform.FACEBOOK || (a.getExternalKey() != null && a.getExternalKey().startsWith("fbwall:")))
            throw new ImportException(404, "not a Messenger conversation");
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
