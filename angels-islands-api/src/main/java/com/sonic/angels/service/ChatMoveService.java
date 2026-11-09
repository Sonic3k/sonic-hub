package com.sonic.angels.service;

import com.sonic.angels.model.dto.ImportDto;
import com.sonic.angels.model.entity.ChatArchive;
import com.sonic.angels.model.entity.ChatMessage;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.repository.ChatArchiveRepository;
import com.sonic.angels.repository.ChatMessageRepository;
import com.sonic.angels.repository.PersonRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Moving messages into the conversation they belong to: a chat saved under one nick that was with another of that
 * person's nicks, or a Yahoo conference that sat inside a one-to-one chat. The messages keep their ids and their seq,
 * so whatever points at them follows: their attachments, the memories quoting them (an episode's source is an archive
 * and a seq) and the posts first imported from them. Both conversations' counts and date ranges are worked out again.
 */
@Service
public class ChatMoveService {

    private static final int MAX_SEQS = 50_000;
    private static final int CHUNK = 1_000;

    private final ChatArchiveRepository archiveRepo;
    private final ChatMessageRepository messageRepo;
    private final PersonRepository personRepo;
    private final EntityManager em;

    public ChatMoveService(ChatArchiveRepository archiveRepo, ChatMessageRepository messageRepo,
                           PersonRepository personRepo, EntityManager em) {
        this.archiveRepo = archiveRepo;
        this.messageRepo = messageRepo;
        this.personRepo = personRepo;
        this.em = em;
    }

    @Transactional
    public ImportDto.MoveResult move(UUID fromId, ImportDto.MoveRequest req) {
        if (req == null) throw new ImportException(400, "a body is expected");
        ChatArchive from = archiveRepo.findById(fromId).orElseThrow(() -> new ImportException(404, "archive not found: " + fromId));
        List<Integer> seqs = req.getSeqs() == null ? List.of() : req.getSeqs().stream().filter(Objects::nonNull).distinct().toList();
        if (seqs.isEmpty()) throw new ImportException(400, "seqs: which messages to move");
        if (seqs.size() > MAX_SEQS) throw new ImportException(413, "at most " + MAX_SEQS + " messages per move");

        boolean[] created = {false};
        ChatArchive to = target(from, req, created);
        if (to.getId().equals(from.getId())) throw new ImportException(400, "the messages are already in that conversation");

        long here = 0, clash = 0;
        for (List<Integer> part : chunks(seqs)) {
            here += count("SELECT COUNT(m) FROM ChatMessage m WHERE m.chatArchive = :a AND m.seq IN :s", from, part);
            clash += count("SELECT COUNT(m) FROM ChatMessage m WHERE m.chatArchive = :a AND m.seq IN :s", to, part);
        }
        if (here != seqs.size()) throw new ImportException(400, (seqs.size() - here) + " of those seqs are not in the conversation");
        if (clash > 0) throw new ImportException(409, "the target already has messages at " + clash + " of those seqs");

        int moved = 0, memories = 0, posts = 0;
        for (List<Integer> part : chunks(seqs)) {
            moved += em.createQuery("UPDATE ChatMessage m SET m.chatArchive = :to WHERE m.chatArchive = :from AND m.seq IN :s")
                .setParameter("to", to).setParameter("from", from).setParameter("s", part).executeUpdate();
            memories += em.createQuery("UPDATE EpisodeSource x SET x.archive = :to WHERE x.archive = :from AND x.position IN :s")
                .setParameter("to", to).setParameter("from", from).setParameter("s", part).executeUpdate();
            posts += em.createQuery("UPDATE SocialPost p SET p.originArchiveId = :to WHERE p.originArchiveId = :from AND p.originSeq IN :s")
                .setParameter("to", to.getId()).setParameter("from", from.getId()).setParameter("s", part).executeUpdate();
            posts += em.createQuery("UPDATE SocialComment c SET c.originArchiveId = :to WHERE c.originArchiveId = :from AND c.originSeq IN :s")
                .setParameter("to", to.getId()).setParameter("from", from.getId()).setParameter("s", part).executeUpdate();
        }

        ImportDto.MoveResult r = new ImportDto.MoveResult();
        r.setMoved(moved);
        r.setMemoryLinks(memories);
        r.setPostLinks(posts);
        r.setCreated(created[0]);
        r.setFrom(refresh(from));
        r.setTo(refresh(to));
        return r;
    }

    /** The conversation the messages go to: by id, or found again (or made) by key under its person or counterpart. */
    private ChatArchive target(ChatArchive from, ImportDto.MoveRequest req, boolean[] created) {
        if (req.getToArchiveId() != null)
            return archiveRepo.findById(req.getToArchiveId()).orElseThrow(() -> new ImportException(404, "target archive not found: " + req.getToArchiveId()));
        String key = trim(req.getToExternalKey());
        if (key == null || key.length() > 200) throw new ImportException(400, "toArchiveId, or toExternalKey (<= 200), is required");
        boolean noPerson = Boolean.TRUE.equals(req.getNoPerson());
        Person p = null;
        String cpKey = trim(req.getCounterpartKey());
        if (noPerson) {
            if (cpKey == null || cpKey.length() > 80 || trim(req.getCounterpart()) == null)
                throw new ImportException(400, "a conversation under no one needs counterpart and counterpartKey (<= 80)");
        } else if (trim(req.getToPersonSlug()) != null) {
            p = personRepo.findBySlug(req.getToPersonSlug().trim()).orElseThrow(() -> new ImportException(404, "unknown person slug: " + req.getToPersonSlug()));
        } else {
            p = from.getPerson();
            if (p == null) throw new ImportException(400, "the source is under no one: say toPersonSlug, or noPerson with counterpart");
        }
        Optional<ChatArchive> found = p != null ? archiveRepo.findByPersonIdAndExternalKey(p.getId(), key)
                                                : archiveRepo.findFirstByCounterpartKeyAndExternalKey(cpKey, key);
        if (found.isPresent()) return found.get();

        ChatArchive a = new ChatArchive();
        a.setPerson(p);
        a.setExternalKey(key);
        a.setPlatform(platform(req.getToPlatform(), from.getPlatform()));
        a.setTitle(cut(trim(req.getToTitle()), 255));
        if (noPerson) {
            a.setCounterpartKey(cpKey);
            a.setCounterpart(cut(req.getCounterpart().trim(), 200));
        }
        a.setSources(from.getSources());
        a.setMessageCount(0);
        a.setExtractionStatus(ChatArchive.ExtractionStatus.PENDING);
        created[0] = true;
        return archiveRepo.saveAndFlush(a);
    }

    /** Count and date range from what the conversation holds now. */
    private ImportDto.FinalizeResult refresh(ChatArchive a) {
        List<Object[]> stats = messageRepo.visibleStats(a.getId(), ChatMessage.Kind.EMPTY);
        Object[] st = stats.isEmpty() ? new Object[]{0L, null, null} : stats.get(0);
        ChatArchive fresh = archiveRepo.findById(a.getId()).orElse(a);
        fresh.setMessageCount(st[0] == null ? 0 : ((Number) st[0]).intValue());
        fresh.setDateFrom((LocalDateTime) st[1]);
        fresh.setDateTo((LocalDateTime) st[2]);
        archiveRepo.save(fresh);
        ImportDto.FinalizeResult f = new ImportDto.FinalizeResult();
        f.setArchiveId(fresh.getId());
        f.setMessageCount(fresh.getMessageCount());
        f.setDateFrom(fresh.getDateFrom());
        f.setDateTo(fresh.getDateTo());
        return f;
    }

    private long count(String jpql, ChatArchive a, List<Integer> seqs) {
        return em.createQuery(jpql, Long.class).setParameter("a", a).setParameter("s", seqs).getSingleResult();
    }

    private static ChatArchive.Platform platform(String s, ChatArchive.Platform dflt) {
        if (trim(s) == null) return dflt;
        try { return ChatArchive.Platform.valueOf(s.trim().toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException e) { throw new ImportException(400, "unknown platform " + s); }
    }

    private static List<List<Integer>> chunks(List<Integer> all) {
        List<List<Integer>> out = new ArrayList<>();
        for (int i = 0; i < all.size(); i += CHUNK) out.add(all.subList(i, Math.min(all.size(), i + CHUNK)));
        return out;
    }

    private static String trim(String s) { return s == null || s.isBlank() ? null : s.trim(); }
    private static String cut(String s, int max) { return s == null ? null : (s.length() <= max ? s : s.substring(0, max)); }
}
