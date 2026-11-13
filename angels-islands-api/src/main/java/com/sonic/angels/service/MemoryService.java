package com.sonic.angels.service;

import com.sonic.angels.model.dto.MemoryDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;

/** Episodes with their links (photos, albums, tags, people), the search over a person's memory, and a random pick
 *  across every kind of memory. */
@Service
@Transactional
public class MemoryService {

    private final PersonRepository personRepo;
    private final EpisodeRepository episodeRepo;
    private final FactRepository factRepo;
    private final LifeChapterRepository chapterRepo;
    private final PersonalityTraitRepository traitRepo;
    private final MediaFileRepository mediaRepo;
    private final CollectionRepository collectionRepo;
    private final TagRepository tagRepo;
    private final ForumThreadRepository threadRepo;
    private final ChatArchiveRepository archiveRepo;
    private final JournalNoteRepository noteRepo;
    private final DtoMapper mapper;

    public MemoryService(PersonRepository personRepo, EpisodeRepository episodeRepo, FactRepository factRepo,
                         LifeChapterRepository chapterRepo, PersonalityTraitRepository traitRepo,
                         MediaFileRepository mediaRepo, CollectionRepository collectionRepo, TagRepository tagRepo,
                         ForumThreadRepository threadRepo, ChatArchiveRepository archiveRepo, JournalNoteRepository noteRepo,
                         DtoMapper mapper) {
        this.personRepo = personRepo; this.episodeRepo = episodeRepo; this.factRepo = factRepo;
        this.chapterRepo = chapterRepo; this.traitRepo = traitRepo;
        this.mediaRepo = mediaRepo; this.collectionRepo = collectionRepo; this.tagRepo = tagRepo;
        this.threadRepo = threadRepo; this.archiveRepo = archiveRepo; this.noteRepo = noteRepo; this.mapper = mapper;
    }

    // ── Episodes ─────────────────────────────────────────────────────────────

    /** What GET …/episodes takes; every field is optional. */
    public record EpisodeQuery(String q, String kind, String status, String source, UUID tagId, UUID personId,
                               UUID mediaId, UUID collectionId, LocalDate from, LocalDate to, Integer minImportance,
                               boolean oldestFirst) {}

    private static final UUID NIL_UUID = new UUID(0, 0);
    private static UUID orNil(UUID id) { return id != null ? id : NIL_UUID; }

    /** A person's memories, with the links inc asks for and no others (a list asks for what it shows). */
    @Transactional(readOnly = true)
    public List<MemoryDto.EpisodeResponse> episodes(UUID personId, EpisodeQuery f, MemoryDto.Includes inc) {
        // "linked to this tag / person / photo / album" is answered by the database, so no link is read to filter
        List<Episode> all = f == null ? episodeRepo.findByPersonIdOrderByOccurredAtDesc(personId)
            : episodeRepo.findLinked(personId, f.tagId() != null, orNil(f.tagId()), f.personId() != null, orNil(f.personId()),
                f.mediaId() != null, orNil(f.mediaId()), f.collectionId() != null, orNil(f.collectionId()));
        // a query typed with its marks ("cờ") matches them exactly; one typed without ("co") matches any marks
        boolean marks = f != null && f.q() != null && !fold(f.q()).equals(lower(f.q()));
        List<String> words = f == null || f.q() == null ? List.of() : words(marks ? lower(f.q()) : fold(f.q()));
        List<Episode> hits = all.stream().filter(e -> matches(e, f, words, marks)).toList();
        if (f != null && f.oldestFirst()) {   // undated ones stay last
            hits = new ArrayList<>(hits);
            hits.sort(Comparator.comparing(Episode::getOccurredAt, Comparator.nullsLast(Comparator.naturalOrder())));
        }
        if (!words.isEmpty()) {   // with a query: the best matches first, the date order kept among equals
            String phrase = String.join(" ", words);
            Map<Episode, Integer> score = new HashMap<>();
            for (Episode e : hits) score.put(e, score(e, phrase, words, marks));
            hits = new ArrayList<>(hits);
            hits.sort(Comparator.comparing(score::get, Comparator.reverseOrder()));
        }
        return hits.stream().map(e -> mapper.toEpisodeResponse(e, inc)).toList();
    }

    @Transactional(readOnly = true)
    public MemoryDto.EpisodeResponse episode(UUID id) {
        return mapper.toEpisodeResponseWithLinks(episodeRepo.findById(id).orElseThrow());
    }

    /** Typed in by hand: CONFIRMED unless the request says otherwise. */
    public MemoryDto.EpisodeResponse create(UUID personId, MemoryDto.EpisodeRequest r) {
        Person person = personRepo.findById(personId).orElseThrow();
        Episode e = newEpisode(person, r.getSource(), r, MemoryStatus.CONFIRMED);
        return mapper.toEpisodeResponseWithLinks(e);
    }

    /** Fields left out (null) keep their value, a blank text clears it; a link list left out keeps the links. */
    public MemoryDto.EpisodeResponse update(UUID id, MemoryDto.EpisodeRequest r) {
        Episode e = episodeRepo.findById(id).orElseThrow();
        if (r.getSummary() != null) e.setSummary(r.getSummary());
        if (r.getSource() != null) e.setSource(blankToNull(r.getSource()));
        apply(e, r);
        return mapper.toEpisodeResponseWithLinks(episodeRepo.save(e));
    }

    /** Used by the import too: an imported episode is a DRAFT unless the importer says it is checked. */
    public Episode newEpisode(Person person, String source, MemoryDto.EpisodeRequest r, MemoryStatus defaultStatus) {
        Episode e = new Episode(); e.setPerson(person); e.setSource(blankToNull(source));
        String summary = r.getSummary() != null ? r.getSummary() : r.getTitle();
        e.setSummary(summary == null ? "" : summary);
        e.setStatus(defaultStatus);
        apply(e, r);
        return episodeRepo.save(e);
    }

    private void apply(Episode e, MemoryDto.EpisodeRequest r) {
        if (r.getTitle() != null) e.setTitle(blankToNull(r.getTitle()));
        if (r.getKind() != null) e.setKind(r.getKind().isBlank() ? null : r.getKind().trim().toUpperCase());
        if (r.getStatus() != null) e.setStatus(status(r.getStatus()));
        if (r.getEmotion() != null) e.setEmotion(blankToNull(r.getEmotion()));
        if (r.getImportance() != null) e.setImportance(r.getImportance());
        if (r.getPrecision() != null)
            e.setOccurredPrecision(r.getPrecision().isBlank() ? null : DatePrecision.valueOf(r.getPrecision().trim().toUpperCase()));
        if (r.getOccurredAt() != null) e.setOccurredAt(r.getOccurredAt());
        // the stored moment is the start of the span it is known to (as albums and files keep theirs)
        if (e.getOccurredAt() != null && e.getOccurredPrecision() != null)
            e.setOccurredAt(e.getOccurredPrecision().floor(e.getOccurredAt()));
        if (r.getApprox() != null) e.setOccurredApprox(r.getApprox() ? Boolean.TRUE : null);
        if (r.getEndAt() != null) e.setEndAt(r.getEndAt());
        if (r.getPlace() != null) {
            e.setPlace(blankToNull(r.getPlace()));
            if (e.getPlace() == null) { e.setLatitude(null); e.setLongitude(null); }
        }
        if (r.getLatitude() != null) e.setLatitude(r.getLatitude());
        if (r.getLongitude() != null) e.setLongitude(r.getLongitude());
        if (r.getExternalKey() != null) e.setExternalKey(blankToNull(r.getExternalKey()));
        if (r.getMediaIds() != null) {
            e.getMediaFiles().clear();
            e.getMediaFiles().addAll(inOrder(r.getMediaIds(), mediaRepo::findAllById, MediaFile::getId));
        }
        if (r.getCollectionIds() != null) {
            e.getCollections().clear();
            e.getCollections().addAll(inOrder(r.getCollectionIds(), collectionRepo::findAllById, com.sonic.angels.model.entity.Collection::getId));
        }
        if (r.getTagIds() != null) {
            e.getTags().clear();
            e.getTags().addAll(inOrder(r.getTagIds(), tagRepo::findAllById, Tag::getId));
        }
        if (r.getPersonIds() != null) {
            e.getPersons().clear();
            e.getPersons().addAll(inOrder(r.getPersonIds(), personRepo::findAllById, Person::getId));
        }
        if (r.getSources() != null) {
            e.getSources().clear();
            int k = 0;
            for (MemoryDto.SourceRef x : r.getSources()) {
                if (x == null) continue;
                EpisodeSource src = new EpisodeSource();
                src.setEpisode(e); src.setSortOrder(k++);
                EpisodeSource.Kind kind = x.getKind() != null ? EpisodeSource.Kind.valueOf(x.getKind().trim().toUpperCase())
                    : x.getThreadId() != null ? EpisodeSource.Kind.FORUM : x.getArchiveId() != null ? EpisodeSource.Kind.CHAT
                    : x.getNoteId() != null ? EpisodeSource.Kind.NOTE : EpisodeSource.Kind.LINK;
                src.setKind(kind);
                // a link that is no longer there is dropped; the words stay
                if (x.getThreadId() != null) threadRepo.findById(x.getThreadId()).ifPresent(src::setThread);
                if (x.getArchiveId() != null) archiveRepo.findById(x.getArchiveId()).ifPresent(src::setArchive);
                if (x.getNoteId() != null) noteRepo.findById(x.getNoteId()).ifPresent(src::setNote);
                src.setPosition(x.getPosition()); src.setExcerpt(blankToNull(x.getExcerpt()));
                src.setAuthor(blankToNull(x.getAuthor())); src.setSaidAt(x.getSaidAt()); src.setUrl(blankToNull(x.getUrl()));
                e.getSources().add(src);
            }
        }
    }

    /** the rows for these ids, in the order asked, each once; ids that are not there are skipped */
    private static <T> List<T> inOrder(List<UUID> ids, Function<List<UUID>, List<T>> load, Function<T, UUID> idOf) {
        List<UUID> want = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (want.isEmpty()) return List.of();
        Map<UUID, T> byId = new HashMap<>();
        for (T t : load.apply(want)) byId.put(idOf.apply(t), t);
        return want.stream().map(byId::get).filter(Objects::nonNull).toList();
    }

    private static boolean matches(Episode e, EpisodeQuery f, List<String> words, boolean marks) {
        if (f == null) return true;
        if (f.kind() != null && !f.kind().isBlank() && !f.kind().trim().equalsIgnoreCase(e.getKind())) return false;
        if (f.status() != null && !f.status().isBlank() && (e.getStatus() == null || !e.getStatus().name().equalsIgnoreCase(f.status().trim()))) return false;
        if (f.source() != null && !f.source().isBlank() && !f.source().trim().equals(e.getSource())) return false;
        if (f.minImportance() != null && (e.getImportance() == null || e.getImportance() < f.minImportance())) return false;
        if (f.from() != null && (e.getOccurredAt() == null || lastDay(e).isBefore(f.from()))) return false;
        if (f.to() != null && (e.getOccurredAt() == null || e.getOccurredAt().toLocalDate().isAfter(f.to()))) return false;
        // tagId, personId, mediaId, collectionId: already applied by the query (EpisodeRepository.findLinked)
        if (words.isEmpty()) return true;
        String text = haystack(e);
        List<String> tokens = words(marks ? lower(text) : fold(text));
        // every word of the query starts a word of the memory: "ma" finds "Mario", not "Hà Nam"
        return words.stream().allMatch(w -> tokens.stream().anyMatch(t -> t.startsWith(w)));
    }

    /** the whole query in the title counts most, then the whole query anywhere, then each word as a whole word */
    private static int score(Episode e, String phrase, List<String> words, boolean marks) {
        String title = String.join(" ", words(marks ? lower(e.getTitle()) : fold(e.getTitle())));
        String text = String.join(" ", words(marks ? lower(haystack(e)) : fold(haystack(e))));
        java.util.Set<String> tokens = new java.util.HashSet<>(Arrays.asList(text.split(" ")));
        int s = 0;
        if ((" " + title + " ").contains(" " + phrase + " ")) s += 8; else if (title.contains(phrase)) s += 4;
        if ((" " + text + " ").contains(" " + phrase + " ")) s += 2;
        s += (int) words.stream().filter(tokens::contains).count();
        return s;
    }

    /** the last day a memory covers: its end, else the end of the span its date is known to */
    private static LocalDate lastDay(Episode e) {
        if (e.getEndAt() != null) return e.getEndAt().toLocalDate();
        DatePrecision p = e.getOccurredPrecision() != null ? e.getOccurredPrecision() : DatePrecision.DAY;
        return p.end(e.getOccurredAt()).minusSeconds(1).toLocalDate();
    }

    /** everything a search word may hit: the texts, the place, tags, people and the photos' captions */
    private static String haystack(Episode e) {
        StringBuilder sb = new StringBuilder();
        for (String s : new String[] { e.getTitle(), e.getSummary(), e.getPlace(), e.getEmotion(), e.getKind(), e.getExternalKey() })
            if (s != null) sb.append(s).append(' ');
        e.getTags().forEach(t -> sb.append(t.getName()).append(' '));
        e.getPersons().forEach(p -> sb.append(p.getName()).append(' ')
            .append(p.getDisplayName() != null ? p.getDisplayName() : "").append(' ')
            .append(p.getNickname() != null ? p.getNickname() : "").append(' '));
        e.getCollections().forEach(c -> sb.append(c.getName()).append(' '));
        e.getMediaFiles().forEach(m -> { if (m != null && m.getCaption() != null) sb.append(m.getCaption()).append(' '); });
        e.getSources().forEach(x -> {
            if (x.getExcerpt() != null) sb.append(x.getExcerpt()).append(' ');
            if (x.getAuthor() != null) sb.append(x.getAuthor()).append(' ');
            if (x.getThread() != null) sb.append(x.getThread().getTitle()).append(' ');
        });
        return sb.toString();
    }

    private static List<String> words(String s) {
        return Arrays.stream(s.split("[^\\p{L}\\p{N}]+")).filter(w -> !w.isBlank()).toList();
    }

    /** lower case, marks kept (in one canonical form) */
    static String lower(String s) { return s == null ? "" : Normalizer.normalize(s, Normalizer.Form.NFC).toLowerCase(Locale.ROOT); }

    /** lower case without Vietnamese marks, so "bong da" finds "Bóng đá" */
    static String fold(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s.toLowerCase(Locale.ROOT).replace('đ', 'd'), Normalizer.Form.NFD);
        return n.replaceAll("\\p{M}+", "");
    }

    // ── Random memory ────────────────────────────────────────────────────────

    /** count memories picked at random: first a kind of memory (episode, fact, chapter, trait — each as likely,
     *  among those that have any), then one item of it; no item twice. status / minImportance narrow the pool.
     *  An episode comes with the links inc asks for. */
    @Transactional(readOnly = true)
    public List<MemoryDto.RandomItem> random(UUID personId, int count, Set<String> types, String status, Integer minImportance,
                                             MemoryDto.Includes inc) {
        MemoryStatus st = status == null || status.isBlank() ? null : status(status);
        Map<String, List<?>> pools = new LinkedHashMap<>();
        // episodes are picked by id and only the picked ones are read: a person has hundreds, each with its links
        if (wants(types, "episode"))
            pools.put("episode", new ArrayList<>(episodeRepo.idsForPick(personId, st == null, st != null ? st : MemoryStatus.CONFIRMED,
                minImportance == null, minImportance != null ? minImportance : 0)));
        if (wants(types, "fact"))
            pools.put("fact", new ArrayList<>(factRepo.findByPersonId(personId).stream().filter(x -> st == null || st == x.getStatus()).toList()));
        if (wants(types, "chapter"))
            pools.put("chapter", new ArrayList<>(chapterRepo.findByPersonIdOrderBySortOrderAsc(personId).stream().filter(x -> st == null || st == x.getStatus()).toList()));
        if (wants(types, "trait"))
            pools.put("trait", new ArrayList<>(traitRepo.findByPersonId(personId).stream().filter(x -> st == null || st == x.getStatus()).toList()));
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        List<MemoryDto.RandomItem> out = new ArrayList<>();
        Map<UUID, MemoryDto.RandomItem> episodes = new HashMap<>();
        int n = Math.max(1, Math.min(count, 50));
        while (out.size() < n) {
            List<String> left = pools.entrySet().stream().filter(x -> !x.getValue().isEmpty()).map(Map.Entry::getKey).toList();
            if (left.isEmpty()) break;
            String type = left.get(rnd.nextInt(left.size()));
            List<?> pool = pools.get(type);
            Object item = pool.remove(rnd.nextInt(pool.size()));
            MemoryDto.RandomItem r = new MemoryDto.RandomItem(); r.setType(type);
            switch (type) {
                case "episode" -> episodes.put((UUID) item, r);
                case "fact" -> r.setFact(mapper.toFactResponse((Fact) item));
                case "chapter" -> r.setChapter(mapper.toChapterResponse((LifeChapter) item));
                default -> r.setTrait(mapper.toTraitResponse((PersonalityTrait) item));
            }
            out.add(r);
        }
        for (Episode e : episodeRepo.findAllById(episodes.keySet())) episodes.get(e.getId()).setEpisode(mapper.toEpisodeResponse(e, inc));
        return out;
    }

    private static boolean wants(Set<String> types, String t) { return types == null || types.isEmpty() || types.contains(t); }

    // ── helpers shared with the controller and the import ───────────────────

    /** "DRAFT" / "confirmed" → the status; blank → none */
    public static MemoryStatus status(String v) {
        if (v == null || v.isBlank()) return null;
        return MemoryStatus.valueOf(v.trim().toUpperCase());
    }

    private static String blankToNull(String v) { return v == null || v.isBlank() ? null : v; }
}
