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

    // IM Oct 31, 2010 12:16:36 AM
    private static final Pattern DATE_HEADER = Pattern.compile("^\\W?IM\\s+(\\w+ \\d+, \\d+ \\d+:\\d+:\\d+ [AP]M)");
    // 11:52:27 PM hypersonic3k: hi em
    private static final Pattern MESSAGE = Pattern.compile("^(\\d+:\\d+:\\d+ [AP]M)\\s+(.+?):\\s*(.*)");
    // Yahoo emoticon HTML fragment: ' alt=':\">' src="https://s.yimg.com/..." ...>
    private static final Pattern EMOTICON_FRAGMENT = Pattern.compile(
        "['\"]?\\s*alt=['\"]([^'\"]+)['\"]\\s+src=['\"]https://s\\.yimg\\.com/[^'\"]+['\"]\\s*border=0\\s*data-emoticon=['\"]true['\"]\\s*>");
    // Standard HTML tags
    private static final Pattern HTML_TAG = Pattern.compile("<[^>]+>");

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("MMM d, yyyy h:mm:ss a", Locale.ENGLISH);
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("h:mm:ss a", Locale.ENGLISH);

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

        // Get self identifiers from person_contacts
        Set<String> selfIdentifiers = getSelfIdentifiers();

        // Read file (try UTF-16 first, fallback UTF-8)
        String raw = readFile(file);
        String[] lines = raw.replace("\r\n", "\n").split("\n");

        // Parse into conversation sessions
        List<ParsedConversation> conversations = parseConversations(lines, selfIdentifiers);

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
        archive.setExtractionStatus(ChatArchive.ExtractionStatus.PENDING);

        List<ChatMessage> allMessages = new ArrayList<>();
        for (ParsedConversation conv : conversations) {
            totalConversations++;
            for (ParsedMessage pm : conv.messages) {
                ChatMessage msg = new ChatMessage();
                msg.setChatArchive(archive);
                msg.setSender(pm.sender);
                msg.setSenderType(pm.isSelf ? ChatMessage.SenderType.SELF : ChatMessage.SenderType.PERSON);
                msg.setContent(pm.content);
                msg.setTimestamp(pm.timestamp);
                allMessages.add(msg);
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
        return result;
    }

    // ── Parsing ──────────────────────────────────────────────────────────────

    private List<ParsedConversation> parseConversations(String[] lines, Set<String> selfIdentifiers) {
        List<ParsedConversation> conversations = new ArrayList<>();
        LocalDateTime currentDate = null;
        List<ParsedMessage> currentMessages = new ArrayList<>();

        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty()) continue;

            // Date header
            Matcher dateMatcher = DATE_HEADER.matcher(line);
            if (dateMatcher.find()) {
                if (!currentMessages.isEmpty() && currentDate != null) {
                    conversations.add(new ParsedConversation(currentDate, currentMessages));
                }
                try {
                    currentDate = LocalDateTime.parse(dateMatcher.group(1), DATE_FMT);
                } catch (Exception e) {
                    log.warn("Failed to parse date: {}", dateMatcher.group(1));
                    currentDate = null;
                }
                currentMessages = new ArrayList<>();
                continue;
            }

            // Message
            Matcher msgMatcher = MESSAGE.matcher(line);
            if (msgMatcher.find() && currentDate != null) {
                String timeStr = msgMatcher.group(1);
                String sender = msgMatcher.group(2);
                String rawContent = msgMatcher.group(3);

                // Clean emoticon fragments → replace with emoticon code
                String content = cleanEmoticons(rawContent);
                // Strip remaining HTML tags
                content = HTML_TAG.matcher(content).replaceAll("").trim();

                if (content.isEmpty()) continue;

                // Build timestamp
                LocalDateTime timestamp;
                try {
                    var time = java.time.LocalTime.parse(timeStr, TIME_FMT);
                    timestamp = currentDate.toLocalDate().atTime(time);
                    // Handle midnight crossover: if time is AM and date header was PM
                    if (time.getHour() < 12 && currentDate.getHour() >= 12) {
                        timestamp = timestamp.plusDays(1);
                    }
                } catch (Exception e) {
                    timestamp = currentDate;
                }

                boolean isSelf = selfIdentifiers.contains(sender.toLowerCase());
                currentMessages.add(new ParsedMessage(sender, content, timestamp, isSelf));
            }
        }

        // Last conversation
        if (!currentMessages.isEmpty() && currentDate != null) {
            conversations.add(new ParsedConversation(currentDate, currentMessages));
        }

        return conversations;
    }

    private String cleanEmoticons(String content) {
        // Replace Yahoo emoticon HTML fragments with their alt text (emoticon code)
        return EMOTICON_FRAGMENT.matcher(content).replaceAll(" $1 ").replaceAll("\\s+", " ").trim();
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
            if (content.contains("IM ") && content.contains(":")) return content;
        } catch (Exception ignored) {}
        // Try UTF-16
        try {
            String content = new String(bytes, StandardCharsets.UTF_16);
            if (content.contains("IM ") && content.contains(":")) return content;
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
        final LocalDateTime timestamp;
        final boolean isSelf;
        ParsedMessage(String sender, String content, LocalDateTime timestamp, boolean isSelf) {
            this.sender = sender; this.content = content; this.timestamp = timestamp; this.isSelf = isSelf;
        }
    }
}
