package com.sonic.angels.service;

import com.sonic.angels.model.dto.ChatArchiveDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.*;

@Service
@Transactional
public class ChatImportService {

    private static final Logger log = LoggerFactory.getLogger(ChatImportService.class);

    // English export header: "IM Oct 31, 2010 12:16:36 AM"
    private static final Pattern HEADER_EN = Pattern.compile("^\\W?IM\\s+(\\w+ \\d+, \\d+ \\d+:\\d+:\\d+ [AP]M)\\s*$");
    // Vietnamese export header: "Tin nhắn nhanh 23:39:19, 28 thg 3, 2013"
    private static final Pattern HEADER_VI = Pattern.compile("^\\W?Tin nhắn nhanh (\\d+:\\d+:\\d+), (\\d+) thg (\\d+), (\\d+)\\s*$");
    // "11:52:27 PM hypersonic3k: hi em" / "23:52:27 hypersonic3k: hi em"
    private static final Pattern MESSAGE_EN = Pattern.compile("^(\\d{1,2}:\\d{2}:\\d{2} [AP]M) ([^:\\n]+?):[ \\t]?(.*)$");
    private static final Pattern MESSAGE_VI = Pattern.compile("^(\\d{1,2}:\\d{2}:\\d{2}) ([^:\\n]+?):[ \\t]?(.*)$");
    // Yahoo emoticon HTML fragment: ' alt=':\">' src="https://s.yimg.com/..." ...>
    private static final Pattern EMOTICON_FRAGMENT = Pattern.compile(
        "['\"]?\\s*alt=['\"]([^'\"]+)['\"]\\s+src=['\"]https://s\\.yimg\\.com/[^'\"]+['\"]\\s*border=0\\s*data-emoticon=['\"]true['\"]\\s*>");
    // Standard HTML tags
    private static final Pattern HTML_TAG = Pattern.compile("<[^>]+>");

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("MMM d, yyyy h:mm:ss a", Locale.ENGLISH);
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("h:mm:ss a", Locale.ENGLISH);
    private static final DateTimeFormatter TIME_24 = DateTimeFormatter.ofPattern("H:mm:ss");
    /** Yahoo wrote local time; the DB keeps UTC. */
    private static final java.time.ZoneId LOCAL_ZONE = java.time.ZoneId.of("Asia/Ho_Chi_Minh");

    private final ChatArchiveRepository archiveRepo;
    private final PersonRepository personRepo;
    private final PersonContactRepository contactRepo;
    private final DtoMapper mapper;

    public ChatImportService(ChatArchiveRepository archiveRepo, PersonRepository personRepo,
                             PersonContactRepository contactRepo, DtoMapper mapper) {
        this.archiveRepo = archiveRepo;
        this.personRepo = personRepo;
        this.contactRepo = contactRepo;
        this.mapper = mapper;
    }

    /**
     * Import Yahoo Messenger chat file for a given Person.
     * Returns list of created ChatArchive responses (one per conversation session).
     */
    public ChatArchiveDto.ImportResult importYahooChat(UUID personId, MultipartFile file) throws IOException {
        Person person = personRepo.findById(personId)
            .orElseThrow(() -> new RuntimeException("Person not found: " + personId));

        // Who is who: the self person's ids, and this person's own ids (its contacts)
        Set<String> selfIdentifiers = getSelfIdentifiers();
        Set<String> personIdentifiers = getPersonIdentifiers(person);

        // Read file (try UTF-16 first, fallback UTF-8)
        String raw = readFile(file);
        String[] lines = raw.replace("\r\n", "\n").split("\n");

        // Parse into conversation sessions
        ParseOutcome outcome = parseConversations(lines, selfIdentifiers, personIdentifiers);
        List<ParsedConversation> conversations = outcome.conversations;

        // Save to DB
        int totalMessages = 0;
        int totalConversations = 0;
        LocalDateTime earliest = null;
        LocalDateTime latest = null;

        // One ChatArchive per file, all messages inside
        ChatArchive archive = new ChatArchive();
        archive.setPerson(person);
        archive.setPlatform(ChatArchive.Platform.YAHOO);
        archive.setTitle(file.getOriginalFilename());
        archive.setRawContent(raw); // full-fidelity source of truth — parser may skip lines, raw never lies
        archive.setExtractionStatus(ChatArchive.ExtractionStatus.PENDING);

        List<ChatMessage> allMessages = new ArrayList<>();
        int seq = 0;
        for (ParsedConversation conv : conversations) {
            totalConversations++;
            for (ParsedMessage pm : conv.messages) {
                ChatMessage msg = new ChatMessage();
                msg.setChatArchive(archive);
                msg.setSender(pm.sender);
                msg.setSenderType(pm.senderType);
                msg.setContent(pm.content);
                msg.setTimestamp(pm.timestamp);
                msg.setSeq(seq++);
                // an emoticon-only line loses its picture in "Save as text": keep the row (it is a turn), hide it in viewers
                msg.setKind(pm.content.isEmpty() ? ChatMessage.Kind.EMPTY : ChatMessage.Kind.TEXT);
                msg.setTimePrecision(ChatMessage.TimePrecision.SECOND);
                allMessages.add(msg);
                if (pm.content.isEmpty()) continue;
                totalMessages++;

                if (earliest == null || pm.timestamp.isBefore(earliest)) earliest = pm.timestamp;
                if (latest == null || pm.timestamp.isAfter(latest)) latest = pm.timestamp;
            }
        }

        archive.setMessages(allMessages);
        archive.setMessageCount(totalMessages);
        archive.setDateFrom(earliest);
        archive.setDateTo(latest);
        archive = archiveRepo.save(archive);

        ChatArchiveDto.ImportResult result = new ChatArchiveDto.ImportResult();
        result.setArchiveId(archive.getId());
        result.setTotalConversations(totalConversations);
        result.setTotalMessages(totalMessages);
        result.setDateFrom(earliest);
        result.setDateTo(latest);
        result.setSkippedLines(outcome.skippedLines);
        return result;
    }

    // ── Parsing ──────────────────────────────────────────────────────────────

    /**
     * The header time of a "Save as text" session is the time of its LAST message, so timestamps are
     * assigned walking backwards from it (a clock that goes up while walking back means the previous day).
     */
    private ParseOutcome parseConversations(String[] lines, Set<String> selfIdentifiers, Set<String> personIdentifiers) {
        List<RawSession> sessions = new ArrayList<>();
        RawSession cur = null;
        int skippedLines = 0;

        for (String rawLine : lines) {
            String line = rawLine.replace("\uFEFF", "").trim();
            if (line.isEmpty()) continue;

            Matcher en = HEADER_EN.matcher(line);
            if (en.find()) {
                cur = null;
                try { cur = new RawSession(LocalDateTime.parse(en.group(1), DATE_FMT), false); }
                catch (Exception e) { log.warn("Failed to parse date: {}", en.group(1)); }
                if (cur != null) sessions.add(cur);
                continue;
            }
            Matcher vi = HEADER_VI.matcher(line);
            if (vi.find()) {
                cur = null;
                try {
                    var time = java.time.LocalTime.parse(vi.group(1), TIME_24);
                    var date = java.time.LocalDate.of(Integer.parseInt(vi.group(4)), Integer.parseInt(vi.group(3)), Integer.parseInt(vi.group(2)));
                    cur = new RawSession(date.atTime(time), true);
                } catch (Exception e) { log.warn("Failed to parse date: {}", line); }
                if (cur != null) sessions.add(cur);
                continue;
            }
            if (cur == null) { skippedLines++; continue; }

            Matcher msg = (cur.vietnamese ? MESSAGE_VI : MESSAGE_EN).matcher(line);
            if (msg.find()) {
                try {
                    var time = java.time.LocalTime.parse(msg.group(1), cur.vietnamese ? TIME_24 : TIME_FMT);
                    cur.lines.add(new String[]{time.toString(), msg.group(2).trim(), msg.group(3)});
                } catch (Exception e) { skippedLines++; }
                continue;
            }
            // Continuation of a multi-line message (no timestamp prefix): append to the last message
            if (!cur.lines.isEmpty()) {
                String[] last = cur.lines.get(cur.lines.size() - 1);
                last[2] = last[2] + "\n" + line;
                continue;
            }
            skippedLines++;
        }

        List<ParsedConversation> conversations = new ArrayList<>();
        for (RawSession s : sessions) {
            if (s.lines.isEmpty()) continue;
            LocalDateTime[] stamps = new LocalDateTime[s.lines.size()];
            LocalDateTime anchor = s.anchor;
            for (int i = s.lines.size() - 1; i >= 0; i--) {
                LocalDateTime cand = anchor.toLocalDate().atTime(java.time.LocalTime.parse(s.lines.get(i)[0]));
                if (cand.isAfter(anchor.plusHours(1))) cand = cand.minusDays(1);
                stamps[i] = cand;
                anchor = cand;
            }
            List<ParsedMessage> msgs = new ArrayList<>();
            for (int i = 0; i < s.lines.size(); i++) {
                String[] l = s.lines.get(i);
                String content = HTML_TAG.matcher(cleanEmoticons(l[2])).replaceAll("");
                content = org.springframework.web.util.HtmlUtils.htmlUnescape(content).replaceAll("[ \\t]+", " ").trim();
                LocalDateTime utc = stamps[i].atZone(LOCAL_ZONE).withZoneSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime();
                msgs.add(new ParsedMessage(l[1], content, utc, side(l[1], selfIdentifiers, personIdentifiers)));
            }
            conversations.add(new ParsedConversation(s.anchor, msgs));
        }
        return new ParseOutcome(conversations, skippedLines);
    }

    private static ChatMessage.SenderType side(String sender, Set<String> self, Set<String> person) {
        String s = sender.toLowerCase(Locale.ROOT);
        if (self.contains(s)) return ChatMessage.SenderType.SELF;
        if (person.contains(s)) return ChatMessage.SenderType.PERSON;
        // 1:1 chat: when we know this person's ids but not ours, the other side is us
        if (!person.isEmpty() && self.isEmpty()) return ChatMessage.SenderType.SELF;
        return ChatMessage.SenderType.PERSON;
    }

    private static final class RawSession {
        final LocalDateTime anchor;
        final boolean vietnamese;
        final List<String[]> lines = new ArrayList<>(); // [time, sender, raw text]
        RawSession(LocalDateTime anchor, boolean vietnamese) { this.anchor = anchor; this.vietnamese = vietnamese; }
    }

    private static final class ParseOutcome {
        final List<ParsedConversation> conversations;
        final int skippedLines;
        ParseOutcome(List<ParsedConversation> conversations, int skippedLines) {
            this.conversations = conversations; this.skippedLines = skippedLines;
        }
    }

    private String cleanEmoticons(String content) {
        // Replace Yahoo emoticon HTML fragments with their alt text (emoticon code)
        return EMOTICON_FRAGMENT.matcher(content).replaceAll(" $1 ");
    }

    private Set<String> getPersonIdentifiers(Person person) {
        Set<String> ids = new HashSet<>();
        for (PersonContact c : person.getContacts()) if (c.getIdentifier() != null) ids.add(c.getIdentifier().toLowerCase(Locale.ROOT));
        return ids;
    }

    private Set<String> getSelfIdentifiers() {
        Person self = personRepo.findByIsSelfTrue().orElse(null);
        Set<String> identifiers = new HashSet<>();
        if (self != null) {
            // Add all contacts as identifiers (lowercase for matching)
            for (PersonContact c : self.getContacts()) {
                identifiers.add(c.getIdentifier().toLowerCase());
            }
            // Also add name variations
            identifiers.add(self.getName().toLowerCase());
            if (self.getDisplayName() != null) identifiers.add(self.getDisplayName().toLowerCase());
            if (self.getNickname() != null) identifiers.add(self.getNickname().toLowerCase());
        }
        return identifiers;
    }

    private String readFile(MultipartFile file) throws IOException {
        byte[] bytes = file.getBytes();
        // Try UTF-16 LE (with BOM)
        try {
            String content = new String(bytes, StandardCharsets.UTF_16LE);
            if ((content.contains("IM ") || content.contains("Tin nhắn nhanh")) && content.contains(":")) return content;
        } catch (Exception ignored) {}
        // Try UTF-16
        try {
            String content = new String(bytes, StandardCharsets.UTF_16);
            if ((content.contains("IM ") || content.contains("Tin nhắn nhanh")) && content.contains(":")) return content;
        } catch (Exception ignored) {}
        // Fallback UTF-8
        return new String(bytes, StandardCharsets.UTF_8);
    }

    // ── Inner classes ────────────────────────────────────────────────────────

    private static class ParsedConversation {
        final LocalDateTime date;
        final List<ParsedMessage> messages;
        ParsedConversation(LocalDateTime date, List<ParsedMessage> messages) {
            this.date = date; this.messages = messages;
        }
    }

    private static class ParsedMessage {
        final String sender;
        final String content;
        final LocalDateTime timestamp; // UTC
        final ChatMessage.SenderType senderType;
        ParsedMessage(String sender, String content, LocalDateTime timestamp, ChatMessage.SenderType senderType) {
            this.sender = sender; this.content = content; this.timestamp = timestamp; this.senderType = senderType;
        }
    }
}
