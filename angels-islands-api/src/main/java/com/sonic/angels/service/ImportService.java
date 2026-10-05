package com.sonic.angels.service;

import com.sonic.angels.config.RootCollectionInitializer;
import com.sonic.angels.model.dto.ImportDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.model.entity.Collection;
import com.sonic.angels.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Bulk importer for normalized chat history (Yahoo / Facebook / SMS) and the raw files it came from.
 * Every write is idempotent: persons map by slug, archives by (person, externalKey),
 * messages by (archive, externalId), raw files by (label, path) + sha256.
 */
@Service
public class ImportService {

    private static final Logger log = LoggerFactory.getLogger(ImportService.class);

    private static final Pattern LABEL = Pattern.compile("^[a-z0-9][a-z0-9.-]{0,63}$");
    private static final Pattern SHA256 = Pattern.compile("^[0-9a-f]{64}$");
    private static final String RAW_FOLDER_SETTING = "storage.raw-folder";
    private static final int MAX_BATCH = 5000;

    private final PersonRepository personRepo;
    private final CollectionRepository collectionRepo;
    private final ChatArchiveRepository archiveRepo;
    private final ChatMessageRepository messageRepo;
    private final ChatAttachmentRepository attachmentRepo;
    private final ImportSourceRepository sourceRepo;
    private final AppSettingRepository settingRepo;
    private final JournalNoteRepository noteRepo;
    private final StorageService storage;
    private final TransactionTemplate newTx;
    private volatile String rawFolderCache;

    public ImportService(PersonRepository personRepo, CollectionRepository collectionRepo,
                         ChatArchiveRepository archiveRepo, ChatMessageRepository messageRepo,
                         ChatAttachmentRepository attachmentRepo, ImportSourceRepository sourceRepo,
                         AppSettingRepository settingRepo, JournalNoteRepository noteRepo, StorageService storage,
                         PlatformTransactionManager txManager) {
        this.personRepo = personRepo;
        this.collectionRepo = collectionRepo;
        this.archiveRepo = archiveRepo;
        this.messageRepo = messageRepo;
        this.attachmentRepo = attachmentRepo;
        this.sourceRepo = sourceRepo;
        this.settingRepo = settingRepo;
        this.noteRepo = noteRepo;
        this.storage = storage;
        this.newTx = new TransactionTemplate(txManager);
        this.newTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    // ── Persons ──────────────────────────────────────────────────────────────

    /**
     * Create or update persons by slug. A person typed in by hand (no slug yet) is claimed when one of
     * its names matches, so nothing is duplicated. Only blank fields are filled — hand edits always win.
     */
    @Transactional
    public List<ImportDto.PersonSyncResult> syncPersons(List<ImportDto.PersonSync> requests) {
        Collection root = collectionRepo.findByNameAndParentIsNull(RootCollectionInitializer.ROOT_NAME).orElse(null);
        List<Person> claimable = personRepo.findBySlugIsNull().stream()
            .filter(p -> !Boolean.TRUE.equals(p.getIsSelf()))
            .collect(Collectors.toCollection(ArrayList::new));
        List<ImportDto.PersonSyncResult> out = new ArrayList<>();
        for (ImportDto.PersonSync req : requests) out.add(syncPerson(req, root, claimable));
        return out;
    }

    private ImportDto.PersonSyncResult syncPerson(ImportDto.PersonSync req, Collection root, List<Person> claimable) {
        String slug = trim(req.getSlug());
        if (slug == null || slug.length() > 80) throw new ImportException(400, "person slug missing or too long");
        ImportDto.PersonSyncResult r = new ImportDto.PersonSyncResult();
        r.setSlug(slug);

        Person p = personRepo.findBySlug(slug).orElse(null);
        String action = "existing";
        if (p == null) {
            Set<String> names = new HashSet<>();
            for (String n : List.of(nz(req.getName()), nz(req.getDisplayName()), nz(req.getNickname()))) addName(names, n);
            if (req.getMatchNames() != null) req.getMatchNames().forEach(n -> addName(names, n));
            List<Person> hits = claimable.stream()
                .filter(x -> names.contains(lc(x.getName())) || names.contains(lc(x.getDisplayName())) || names.contains(lc(x.getNickname())))
                .toList();
            if (hits.size() > 1) {
                r.setAction("ambiguous");
                r.getWarnings().add("several existing persons match: " + hits.stream().map(Person::getName).collect(Collectors.joining(", ")));
                return r;
            }
            if (hits.size() == 1) {
                p = hits.get(0);
                claimable.remove(p);
                action = "claimed";
            } else {
                p = new Person();
                action = "created";
            }
            p.setSlug(slug);
        }
        if (blank(p.getName())) p.setName(firstNonBlank(req.getName(), req.getDisplayName(), slug));
        if (blank(p.getDisplayName()) && !blank(req.getDisplayName())) p.setDisplayName(cut(req.getDisplayName().trim(), 255));
        if (blank(p.getNickname()) && !blank(req.getNickname())) p.setNickname(cut(req.getNickname().trim(), 255));
        if (blank(p.getAlternativeName()) && !blank(req.getAlternativeName())) p.setAlternativeName(cut(req.getAlternativeName().trim(), 255));

        Set<String> have = new HashSet<>();
        for (PersonContact c : p.getContacts()) have.add(c.getPlatform() + "|" + lc(c.getIdentifier()));
        int added = 0;
        if (req.getContacts() != null) {
            for (ImportDto.ContactSync c : req.getContacts()) {
                String id = trim(c.getIdentifier());
                if (id == null) continue;
                PersonContact.Platform platform;
                try { platform = PersonContact.Platform.valueOf(nz(c.getPlatform()).trim().toUpperCase(Locale.ROOT)); }
                catch (IllegalArgumentException e) { r.getWarnings().add("unknown contact platform " + c.getPlatform()); continue; }
                if (!have.add(platform + "|" + lc(id))) continue;
                PersonContact pc = new PersonContact();
                pc.setPerson(p);
                pc.setPlatform(platform);
                pc.setIdentifier(cut(id, 255));
                pc.setDisplayName(cut(trim(c.getDisplayName()), 255));
                pc.setNotes(cut(trim(c.getNotes()), 255));
                p.getContacts().add(pc);
                added++;
            }
        }
        p = personRepo.saveAndFlush(p);

        if (root != null && req.getCollectionPath() != null && !req.getCollectionPath().isEmpty()) {
            Collection cur = root;
            for (String seg : req.getCollectionPath()) {
                List<Collection> kids = collectionRepo.findByParentIdAndName(cur.getId(), seg);
                if (kids.size() != 1) {
                    r.getWarnings().add((kids.isEmpty() ? "album not found: " : "album name not unique: ") + String.join(" / ", req.getCollectionPath()));
                    cur = null;
                    break;
                }
                cur = kids.get(0);
            }
            if (cur != null) {
                collectionRepo.linkPerson(cur.getId(), p.getId());
                r.setCollectionId(cur.getId());
                r.setCollectionLinked(true);
            }
        }
        r.setPersonId(p.getId());
        r.setName(p.getName());
        r.setAction(action);
        r.setContactsAdded(added);
        return r;
    }

    // ── Archives ─────────────────────────────────────────────────────────────

    /**
     * An angel's archive maps by (person, externalKey). An other chat (no person) maps by
     * (counterpartKey, externalKey), so it is found again even after it was linked to someone by hand.
     */
    @Transactional
    public ImportDto.ArchiveResult upsertArchive(ImportDto.ArchiveUpsert req) {
        String slug = trim(req.getPersonSlug());
        String cpKey = trim(req.getCounterpartKey());
        Person p = null;
        if (slug != null) {
            p = personRepo.findBySlug(slug).orElseThrow(() -> new ImportException(404, "unknown person slug: " + req.getPersonSlug()));
        } else if (cpKey == null || cpKey.length() > 80 || blank(req.getCounterpart())) {
            throw new ImportException(400, "personSlug, or counterpartKey (<= 80) + counterpart, is required");
        }
        String key = trim(req.getExternalKey());
        if (key == null || key.length() > 200) throw new ImportException(400, "externalKey missing or too long");
        ChatArchive.Platform platform;
        try { platform = ChatArchive.Platform.valueOf(nz(req.getPlatform()).trim().toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException e) { throw new ImportException(400, "unknown platform " + req.getPlatform()); }

        ChatArchive a = p != null ? archiveRepo.findByPersonIdAndExternalKey(p.getId(), key).orElse(null)
                                  : archiveRepo.findFirstByCounterpartKeyAndExternalKey(cpKey, key).orElse(null);
        boolean created = a == null;
        if (created) {
            a = new ChatArchive();
            a.setPerson(p);
            a.setExternalKey(key);
            a.setMessageCount(0);
            a.setExtractionStatus(ChatArchive.ExtractionStatus.PENDING);
        }
        if (p == null) {
            a.setCounterpartKey(cpKey);
            if (created || blank(a.getCounterpart())) a.setCounterpart(cut(req.getCounterpart().trim(), 200));  // a rename by hand wins
        }
        a.setPlatform(platform);
        if (!blank(req.getTitle())) a.setTitle(cut(req.getTitle().trim(), 255));
        if (req.getSources() != null && !req.getSources().isEmpty()) a.setSources(cut(String.join(",", req.getSources()), 500));
        a = archiveRepo.save(a);

        ImportDto.ArchiveResult r = new ImportDto.ArchiveResult();
        r.setArchiveId(a.getId());
        r.setCreated(created);
        r.setStoredMessages(created ? 0 : messageRepo.countByChatArchiveId(a.getId()));
        return r;
    }

    /** Remove an imported archive the importer no longer produces (e.g. a thread that got a new key). */
    @Transactional
    public int deleteArchive(UUID archiveId) {
        ChatArchive a = archiveRepo.findById(archiveId)
            .orElseThrow(() -> new ImportException(404, "archive not found: " + archiveId));
        if (a.getExternalKey() == null) throw new ImportException(400, "only imported archives can be deleted here");
        int n = messageRepo.deleteByArchiveId(archiveId);
        archiveRepo.delete(a);
        return n;
    }

    // ── Writings ─────────────────────────────────────────────────────────────

    /**
     * Journal notes written by someone else (an angel's story, a friend's Facebook note), keyed by externalKey.
     * A note that is already here is left as it is (hand edits win) unless overwrite is set.
     */
    @Transactional
    public List<ImportDto.WritingResult> importWritings(List<ImportDto.WritingIn> items, boolean overwrite) {
        if (items == null) items = List.of();
        if (items.size() > 500) throw new ImportException(413, "at most 500 writings per request");
        List<ImportDto.WritingResult> out = new ArrayList<>();
        for (ImportDto.WritingIn w : items) {
            String key = trim(w.getExternalKey());
            if (key == null || key.length() > 200) throw new ImportException(400, "writing externalKey missing or too long");
            if (blank(w.getContent())) throw new ImportException(400, "writing " + key + " has no content");
            ImportDto.WritingResult r = new ImportDto.WritingResult();
            r.setExternalKey(key);
            Person author = null;
            String slug = trim(w.getAuthorSlug());
            if (slug != null) {
                author = personRepo.findBySlug(slug).orElse(null);
                if (author == null) r.getWarnings().add("unknown author slug " + slug + " (kept as a name only)");
            }
            LocalDateTime written = blank(w.getWrittenAt()) ? null : parseTimestamp(w.getWrittenAt());
            String authorName = cut(trim(w.getAuthorName()), 200);
            String title = cut(trim(w.getTitle()), 255);
            String source = cut(trim(w.getSource()), 500);
            String mood = cut(trim(w.getMood()), 255);

            JournalNote n = noteRepo.findByExternalKey(key).orElse(null);
            String action;
            if (n == null) {
                n = new JournalNote();
                n.setExternalKey(key);
                n.setKind(JournalNote.Kind.JOURNAL);
                n.setStatus(JournalNote.Status.DRAFT);
                n.setTitle(title); n.setContent(w.getContent()); n.setMood(mood);
                n.setAuthorPerson(author); n.setAuthorName(authorName); n.setWrittenAt(written); n.setSource(source);
                action = "created";
            } else if (overwrite) {
                boolean same = Objects.equals(n.getTitle(), title) && Objects.equals(n.getContent(), w.getContent())
                    && Objects.equals(n.getAuthorName(), authorName) && Objects.equals(n.getWrittenAt(), written)
                    && Objects.equals(n.getSource(), source)
                    && Objects.equals(n.getAuthorPerson() == null ? null : n.getAuthorPerson().getId(), author == null ? null : author.getId());
                n.setTitle(title); n.setContent(w.getContent());
                if (mood != null) n.setMood(mood);
                n.setAuthorPerson(author); n.setAuthorName(authorName); n.setWrittenAt(written); n.setSource(source);
                action = same ? "unchanged" : "updated";
            } else if (n.getAuthorPerson() == null && author != null && Objects.equals(n.getAuthorName(), authorName)) {
                n.setAuthorPerson(author);   // imported before that angel existed: link now, nothing else changes
                action = "linked";
            } else {
                action = "kept";      // it was imported with every field set: what differs now was changed by hand
            }
            if (!action.equals("kept")) n = noteRepo.save(n);
            r.setNoteId(n.getId());
            r.setAction(action);
            out.add(r);
        }
        return out;
    }

    /** Insert new messages, update changed ones, leave identical ones alone. */
    @Transactional
    public ImportDto.MessageBatchResult upsertMessages(UUID archiveId, List<ImportDto.MessageIn> batch) {
        if (batch == null) batch = List.of();
        if (batch.size() > MAX_BATCH) throw new ImportException(413, "at most " + MAX_BATCH + " messages per request");
        ChatArchive archive = archiveRepo.findById(archiveId)
            .orElseThrow(() -> new ImportException(404, "archive not found: " + archiveId));

        Map<String, ImportDto.MessageIn> incoming = new LinkedHashMap<>();
        for (ImportDto.MessageIn m : batch) {
            String id = trim(m.getExternalId());
            if (id == null || id.length() > 64) throw new ImportException(400, "externalId missing or too long");
            if (incoming.put(id, m) != null) throw new ImportException(400, "duplicate externalId in batch: " + id);
        }
        Map<String, ChatMessage> existing = new HashMap<>();
        if (!incoming.isEmpty())
            for (ChatMessage m : messageRepo.findByChatArchiveIdAndExternalIdIn(archiveId, incoming.keySet()))
                existing.put(m.getExternalId(), m);
        Map<UUID, List<ChatAttachment>> existingAtt = new HashMap<>();
        if (!existing.isEmpty()) {
            Set<UUID> ids = existing.values().stream().map(ChatMessage::getId).collect(Collectors.toSet());
            for (ChatAttachment a : attachmentRepo.findByMessageIdIn(ids))
                existingAtt.computeIfAbsent(a.getMessage().getId(), k -> new ArrayList<>()).add(a);
        }

        List<ChatMessage> fresh = new ArrayList<>();
        List<UUID> replaceAttachmentsOf = new ArrayList<>();
        List<ChatAttachment> newAttachments = new ArrayList<>();
        int inserted = 0, updated = 0, unchanged = 0;
        for (Map.Entry<String, ImportDto.MessageIn> e : incoming.entrySet()) {
            ImportDto.MessageIn in = e.getValue();
            ChatMessage m = existing.get(e.getKey());
            boolean isNew = m == null;
            if (isNew) {
                m = new ChatMessage();
                m.setChatArchive(archive);
                m.setExternalId(e.getKey());
            }
            boolean changed = apply(m, in);
            List<ImportDto.AttachmentIn> want = in.getAttachments() == null ? List.of() : in.getAttachments();
            boolean attChanged = isNew ? !want.isEmpty() : !sameAttachments(existingAtt.getOrDefault(m.getId(), List.of()), want);
            if (isNew) { inserted++; fresh.add(m); }
            else if (changed || attChanged) updated++;
            else unchanged++;
            if (attChanged) {
                if (!isNew) replaceAttachmentsOf.add(m.getId());
                for (ImportDto.AttachmentIn w : want) newAttachments.add(toAttachment(m, w));
            }
        }
        messageRepo.saveAll(fresh);
        if (!replaceAttachmentsOf.isEmpty()) attachmentRepo.deleteByMessageIds(replaceAttachmentsOf);
        linkKnownSources(newAttachments);
        attachmentRepo.saveAll(newAttachments);

        ImportDto.MessageBatchResult r = new ImportDto.MessageBatchResult();
        r.setInserted(inserted);
        r.setUpdated(updated);
        r.setUnchanged(unchanged);
        r.setAttachments(newAttachments.size());
        return r;
    }

    /** Optionally prune messages that are no longer in the source, then refresh count and date range. */
    @Transactional
    public ImportDto.FinalizeResult finalizeArchive(UUID archiveId, ImportDto.FinalizeRequest req) {
        ChatArchive a = archiveRepo.findById(archiveId)
            .orElseThrow(() -> new ImportException(404, "archive not found: " + archiveId));
        int pruned = 0;
        if (req != null && req.getKeepExternalIds() != null) {
            if (a.getExternalKey() == null) throw new ImportException(400, "only imported archives can be pruned");
            Set<String> keep = new HashSet<>(req.getKeepExternalIds());
            List<UUID> drop = new ArrayList<>();
            for (Object[] row : messageRepo.findIdAndExternalIdByArchive(archiveId)) {
                String ext = (String) row[1];
                if (ext != null && !keep.contains(ext)) drop.add((UUID) row[0]);
            }
            for (int i = 0; i < drop.size(); i += 1000) messageRepo.deleteByIds(drop.subList(i, Math.min(drop.size(), i + 1000)));
            pruned = drop.size();
        }
        List<Object[]> stats = messageRepo.visibleStats(archiveId, ChatMessage.Kind.EMPTY);
        Object[] st = stats.isEmpty() ? new Object[]{0L, null, null} : stats.get(0);
        a.setMessageCount(st[0] == null ? 0 : ((Number) st[0]).intValue());
        a.setDateFrom((LocalDateTime) st[1]);
        a.setDateTo((LocalDateTime) st[2]);
        archiveRepo.save(a);

        ImportDto.FinalizeResult r = new ImportDto.FinalizeResult();
        r.setArchiveId(a.getId());
        r.setMessageCount(a.getMessageCount());
        r.setPruned(pruned);
        r.setDateFrom(a.getDateFrom());
        r.setDateTo(a.getDateTo());
        return r;
    }

    // ── Raw files ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ImportDto.RawCheckResult> checkRaw(List<ImportDto.RawFileRef> refs) {
        if (refs == null) refs = List.of();
        if (refs.size() > MAX_BATCH) throw new ImportException(413, "at most " + MAX_BATCH + " files per request");
        Map<String, List<String>> pathsByLabel = new HashMap<>();
        for (ImportDto.RawFileRef f : refs) pathsByLabel.computeIfAbsent(checkLabel(f.getLabel()), k -> new ArrayList<>()).add(checkPath(f.getPath()));
        Map<String, ImportSource> known = new HashMap<>();
        for (Map.Entry<String, List<String>> e : pathsByLabel.entrySet()) {
            List<String> paths = e.getValue();
            for (int i = 0; i < paths.size(); i += 500)
                for (ImportSource s : sourceRepo.findByLabelAndPathIn(e.getKey(), paths.subList(i, Math.min(paths.size(), i + 500))))
                    known.put(s.getLabel() + "\n" + s.getPath(), s);
        }
        List<ImportDto.RawCheckResult> out = new ArrayList<>();
        for (ImportDto.RawFileRef f : refs) {
            String label = checkLabel(f.getLabel()), path = checkPath(f.getPath());
            ImportSource s = known.get(label + "\n" + path);
            ImportDto.RawCheckResult r = new ImportDto.RawCheckResult();
            r.setLabel(label);
            r.setPath(path);
            boolean same = s != null && s.getSha256().equalsIgnoreCase(nz(f.getSha256()))
                && (f.getSize() == null || f.getSize().equals(s.getSizeBytes()));
            r.setStatus(s == null ? "missing" : same ? "same" : "changed");
            out.add(r);
        }
        return out;
    }

    /** Store one raw file under raw/<private folder>/<label>/<path>, verify its sha256, link attachments to it. */
    @Transactional
    public ImportDto.RawUploadResult uploadRaw(String label, String path, String sha256, MultipartFile file) throws IOException {
        label = checkLabel(label);
        path = checkPath(path);
        String expected = nz(sha256).trim().toLowerCase(Locale.ROOT);
        if (!SHA256.matcher(expected).matches()) throw new ImportException(400, "sha256 must be 64 hex characters");
        if (file == null) throw new ImportException(400, "file missing");
        if (!storage.isConfigured()) throw new ImportException(503, "storage is not configured on the server");

        String key = rawFolder() + "/" + label + "/" + path;
        String contentType = contentType(file.getContentType(), path);
        MessageDigest md = sha256();
        String fullKey;
        try (InputStream in = new DigestInputStream(file.getInputStream(), md)) {
            fullKey = storage.upload(in, file.getSize(), key, contentType);
        }
        String actual = hex(md.digest());
        if (!actual.equals(expected)) {
            try { storage.delete(fullKey); } catch (Exception ignored) { }
            throw new ImportException(400, "sha256 mismatch for " + label + "/" + path + " (got " + actual + ")");
        }

        ImportSource src = sourceRepo.findByLabelAndPath(label, path).orElseGet(ImportSource::new);
        src.setLabel(label);
        src.setPath(path);
        src.setStorageKey(fullKey);
        src.setSha256(actual);
        src.setSizeBytes(file.getSize());
        src.setContentType(contentType);
        src = sourceRepo.saveAndFlush(src);
        int linked = attachmentRepo.linkSource(src, label, path);

        ImportDto.RawUploadResult r = new ImportDto.RawUploadResult();
        r.setId(src.getId());
        r.setLabel(label);
        r.setPath(path);
        r.setSize(file.getSize());
        r.setLinkedAttachments(linked);
        return r;
    }

    /** [storageKey, contentType, fileName] of an attachment whose file is stored, if any. */
    @Transactional(readOnly = true)
    public Optional<String[]> attachmentObject(UUID attachmentId) {
        return attachmentRepo.findById(attachmentId)
            .filter(a -> a.getImportSource() != null)
            .map(a -> new String[]{a.getImportSource().getStorageKey(), a.getImportSource().getContentType(),
                a.getFileName() != null ? a.getFileName() : "attachment"});
    }

    // ── Status ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ImportDto.Status status() {
        ImportDto.Status s = new ImportDto.Status();
        s.setStorageConfigured(storage.isConfigured());
        // an other chat linked to a person by hand is still the others step's archive, not the person's
        List<ChatArchive> archives = archiveRepo.findAllOfImportedPersons().stream()
            .filter(a -> a.getCounterpartKey() == null).toList();
        Map<UUID, Long> stored = new HashMap<>();
        List<UUID> ids = archives.stream().map(ChatArchive::getId).toList();
        for (int i = 0; i < ids.size(); i += 500)
            for (Object[] row : messageRepo.countByArchiveIds(ids.subList(i, Math.min(ids.size(), i + 500))))
                stored.put((UUID) row[0], ((Number) row[1]).longValue());
        Map<UUID, List<ChatArchive>> byPerson = archives.stream().collect(Collectors.groupingBy(a -> a.getPerson().getId()));
        for (Person p : personRepo.findBySlugIsNotNull()) {
            ImportDto.PersonStatus ps = new ImportDto.PersonStatus();
            ps.setSlug(p.getSlug());
            ps.setPersonId(p.getId());
            ps.setName(p.getName());
            for (ChatArchive a : byPerson.getOrDefault(p.getId(), List.of())) {
                ImportDto.ArchiveStatus as = new ImportDto.ArchiveStatus();
                as.setId(a.getId());
                as.setExternalKey(a.getExternalKey());
                as.setPlatform(a.getPlatform().name());
                as.setTitle(a.getTitle());
                as.setMessageCount(a.getMessageCount());
                as.setStoredMessages(stored.getOrDefault(a.getId(), 0L));
                ps.getArchives().add(as);
            }
            s.getPersons().add(ps);
        }
        s.getPersons().sort(Comparator.comparing(ImportDto.PersonStatus::getSlug));
        List<ChatArchive> others = archiveRepo.findOthers().stream().filter(a -> a.getCounterpartKey() != null).toList();
        Map<UUID, Long> storedOthers = new HashMap<>();
        List<UUID> oids = others.stream().map(ChatArchive::getId).toList();
        for (int i = 0; i < oids.size(); i += 500)
            for (Object[] row : messageRepo.countByArchiveIds(oids.subList(i, Math.min(oids.size(), i + 500))))
                storedOthers.put((UUID) row[0], ((Number) row[1]).longValue());
        Map<String, ImportDto.OtherStatus> byKey = new TreeMap<>();
        for (ChatArchive a : others) {
            ImportDto.OtherStatus os = byKey.computeIfAbsent(a.getCounterpartKey(), k -> {
                ImportDto.OtherStatus x = new ImportDto.OtherStatus();
                x.setCounterpartKey(k);
                return x;
            });
            if (os.getCounterpart() == null) os.setCounterpart(a.getCounterpart());
            ImportDto.ArchiveStatus as = new ImportDto.ArchiveStatus();
            as.setId(a.getId());
            as.setExternalKey(a.getExternalKey());
            as.setPlatform(a.getPlatform().name());
            as.setTitle(a.getTitle());
            as.setMessageCount(a.getMessageCount());
            as.setStoredMessages(storedOthers.getOrDefault(a.getId(), 0L));
            os.getArchives().add(as);
        }
        s.getOthers().addAll(byKey.values());
        s.setWritings(noteRepo.countByExternalKeyIsNotNull());
        for (Object[] row : sourceRepo.totalsByLabel()) {
            ImportDto.RawLabelStatus r = new ImportDto.RawLabelStatus();
            r.setLabel((String) row[0]);
            r.setFiles(((Number) row[1]).longValue());
            r.setBytes(((Number) row[2]).longValue());
            s.getRaw().add(r);
        }
        s.setAttachments(attachmentRepo.count());
        s.setAttachmentsWithFile(attachmentRepo.countBySourcePathIsNotNull());
        s.setAttachmentsStored(attachmentRepo.countByImportSourceIsNotNull());
        return s;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Copy incoming fields onto the entity; true if anything changed. */
    private boolean apply(ChatMessage m, ImportDto.MessageIn in) {
        boolean changed = false;
        Integer seq = in.getSeq();
        if (seq != null && !seq.equals(m.getSeq())) { m.setSeq(seq); changed = true; }
        LocalDateTime ts = parseTimestamp(in.getTimestamp());
        if (!Objects.equals(ts, m.getTimestamp())) { m.setTimestamp(ts); changed = true; }
        ChatMessage.TimePrecision prec = precision(in.getPrecision());
        if (prec != m.getTimePrecision()) { m.setTimePrecision(prec); changed = true; }
        ChatMessage.SenderType type = senderType(in.getSide());
        if (type != m.getSenderType()) { m.setSenderType(type); changed = true; }
        String sender = cut(nz(in.getSender()), 255);
        if (!sender.equals(m.getSender())) { m.setSender(sender); changed = true; }
        String content = nz(in.getContent());
        if (!content.equals(m.getContent())) { m.setContent(content); changed = true; }
        ChatMessage.Kind kind = kind(in.getKind());
        if (kind != m.getKind()) { m.setKind(kind); changed = true; }
        String sources = in.getSources() == null || in.getSources().isEmpty() ? null : cut(String.join(",", in.getSources()), 300);
        if (!Objects.equals(sources, m.getSources())) { m.setSources(sources); changed = true; }
        String reactions = in.getReactions() == null || in.getReactions().isEmpty() ? null : cut(String.join(" · ", in.getReactions()), 1000);
        if (!Objects.equals(reactions, m.getReactions())) { m.setReactions(reactions); changed = true; }
        String replyTo = cut(trim(in.getReplyTo()), 64);
        if (!Objects.equals(replyTo, m.getReplyToExternalId())) { m.setReplyToExternalId(replyTo); changed = true; }
        return changed;
    }

    private ChatAttachment toAttachment(ChatMessage m, ImportDto.AttachmentIn w) {
        ChatAttachment a = new ChatAttachment();
        a.setMessage(m);
        a.setType(attachmentType(w.getType()));
        String path = trim(w.getSourcePath());
        String url = trim(w.getUrl());
        if (path != null && (path.startsWith("http://") || path.startsWith("https://"))) { url = path; path = null; }
        if (path != null) {
            a.setSourceLabel(checkLabel(w.getSourceLabel()));
            a.setSourcePath(checkPath(path));
        }
        a.setUrl(cut(url, 1000));
        String name = trim(w.getFileName());
        if (name == null && path != null) name = path.substring(path.lastIndexOf('/') + 1);
        a.setFileName(cut(name, 300));
        return a;
    }

    private boolean sameAttachments(List<ChatAttachment> have, List<ImportDto.AttachmentIn> want) {
        if (have.size() != want.size()) return false;
        Set<String> a = new HashSet<>(), b = new HashSet<>();
        for (ChatAttachment x : have) a.add(x.getType() + "|" + x.getSourceLabel() + "|" + x.getSourcePath() + "|" + x.getUrl());
        for (ImportDto.AttachmentIn w : want) {
            ChatAttachment t = toAttachment(null, w);
            b.add(t.getType() + "|" + t.getSourceLabel() + "|" + t.getSourcePath() + "|" + t.getUrl());
        }
        return a.equals(b);
    }

    private void linkKnownSources(List<ChatAttachment> atts) {
        Map<String, List<ChatAttachment>> byLabel = atts.stream().filter(a -> a.getSourcePath() != null)
            .collect(Collectors.groupingBy(ChatAttachment::getSourceLabel));
        for (Map.Entry<String, List<ChatAttachment>> e : byLabel.entrySet()) {
            List<String> paths = e.getValue().stream().map(ChatAttachment::getSourcePath).distinct().toList();
            Map<String, ImportSource> found = new HashMap<>();
            for (int i = 0; i < paths.size(); i += 500)
                for (ImportSource s : sourceRepo.findByLabelAndPathIn(e.getKey(), paths.subList(i, Math.min(paths.size(), i + 500))))
                    found.put(s.getPath(), s);
            for (ChatAttachment a : e.getValue()) a.setImportSource(found.get(a.getSourcePath()));
        }
    }

    /**
     * "raw/<random>": raw chats sit under an unguessable folder because the bucket is served by a public CDN.
     * Created once, in its own committed transaction, so parallel first uploads all agree on it.
     */
    private String rawFolder() {
        String cached = rawFolderCache;
        if (cached != null) return cached;
        synchronized (this) {
            if (rawFolderCache == null) {
                rawFolderCache = newTx.execute(tx -> settingRepo.findById(RAW_FOLDER_SETTING).map(AppSetting::getValue).orElseGet(() -> {
                    byte[] b = new byte[12];
                    new SecureRandom().nextBytes(b);
                    log.info("Created private raw storage folder");
                    return settingRepo.saveAndFlush(new AppSetting(RAW_FOLDER_SETTING, "raw/" + hex(b))).getValue();
                }));
            }
            return rawFolderCache;
        }
    }

    static LocalDateTime parseTimestamp(String raw) {
        String s = trim(raw);
        if (s == null) return null;
        try {
            if (s.endsWith("Z") || s.matches(".*[+-]\\d{2}:\\d{2}$")) return LocalDateTime.ofInstant(Instant.parse(s), ZoneOffset.UTC);
            return LocalDateTime.parse(s);
        } catch (Exception e) {
            try { return java.time.OffsetDateTime.parse(s).withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime(); }
            catch (Exception e2) { throw new ImportException(400, "bad timestamp: " + raw); }
        }
    }

    private static ChatMessage.TimePrecision precision(String p) {
        String s = nz(p).trim().toLowerCase(Locale.ROOT);
        return switch (s) {
            case "s", "second" -> ChatMessage.TimePrecision.SECOND;
            case "m", "minute" -> ChatMessage.TimePrecision.MINUTE;
            case "g", "group" -> ChatMessage.TimePrecision.GROUP;
            case "d", "day" -> ChatMessage.TimePrecision.DAY;
            default -> null;
        };
    }

    private static ChatMessage.SenderType senderType(String side) {
        String s = nz(side).trim().toLowerCase(Locale.ROOT);
        return switch (s) {
            case "self" -> ChatMessage.SenderType.SELF;
            case "them", "person" -> ChatMessage.SenderType.PERSON;
            case "system" -> ChatMessage.SenderType.SYSTEM;
            default -> ChatMessage.SenderType.OTHER;
        };
    }

    private static ChatMessage.Kind kind(String k) {
        String s = nz(k).trim().toUpperCase(Locale.ROOT);
        if (s.isEmpty()) return ChatMessage.Kind.TEXT;
        try { return ChatMessage.Kind.valueOf(s); } catch (IllegalArgumentException e) { return ChatMessage.Kind.OTHER; }
    }

    private static ChatAttachment.Type attachmentType(String t) {
        String s = nz(t).trim().toUpperCase(Locale.ROOT);
        try { return ChatAttachment.Type.valueOf(s); } catch (IllegalArgumentException e) { return ChatAttachment.Type.FILE; }
    }

    private static String checkLabel(String label) {
        String l = nz(label).trim();
        if (!LABEL.matcher(l).matches()) throw new ImportException(400, "bad label: " + label);
        return l;
    }

    private static String checkPath(String path) {
        String p = nz(path).trim().replace('\\', '/');
        while (p.startsWith("/")) p = p.substring(1);
        if (p.isEmpty() || p.length() > 600) throw new ImportException(400, "path missing or too long");
        for (String seg : p.split("/")) {
            if (seg.isEmpty() || seg.equals(".") || seg.equals("..")) throw new ImportException(400, "bad path: " + path);
        }
        return p;
    }

    private static String contentType(String declared, String path) {
        if (declared != null && !declared.isBlank() && !declared.equalsIgnoreCase("application/octet-stream")) return declared;
        String name = path.substring(path.lastIndexOf('/') + 1).toLowerCase(Locale.ROOT);
        String guess = java.net.URLConnection.getFileNameMap().getContentTypeFor(name);
        if (guess != null) return guess;
        if (name.endsWith(".mp4")) return "video/mp4";
        if (name.endsWith(".mp3")) return "audio/mpeg";
        if (name.endsWith(".m4a") || name.endsWith(".aac")) return "audio/mp4";
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (name.endsWith(".htm") || name.endsWith(".html")) return "text/html; charset=utf-8";
        if (name.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    private static MessageDigest sha256() {
        try { return MessageDigest.getInstance("SHA-256"); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    private static String hex(byte[] b) {
        StringBuilder sb = new StringBuilder(b.length * 2);
        for (byte x : b) sb.append(Character.forDigit((x >> 4) & 0xF, 16)).append(Character.forDigit(x & 0xF, 16));
        return sb.toString();
    }

    private static void addName(Set<String> names, String n) { if (!blank(n)) names.add(lc(n)); }
    private static String lc(String s) { return s == null ? "" : s.trim().toLowerCase(Locale.ROOT); }
    private static String nz(String s) { return s == null ? "" : s; }
    private static boolean blank(String s) { return s == null || s.isBlank(); }
    private static String trim(String s) { return blank(s) ? null : s.trim(); }
    private static String cut(String s, int max) { return s == null ? null : (s.length() <= max ? s : s.substring(0, max)); }
    private static String firstNonBlank(String... xs) { for (String x : xs) if (!blank(x)) return x.trim(); return null; }
}
