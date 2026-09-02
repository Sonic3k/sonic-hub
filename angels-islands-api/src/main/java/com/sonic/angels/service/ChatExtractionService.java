package com.sonic.angels.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Chat archive → memory extraction pipeline.
 * Reads messages in original order (seq), chunks them, asks the LLM for
 * facts about the person + shared episodes, dedupes against existing memory,
 * saves with sourceArchiveId provenance, and flips extractionStatus.
 * Archive stays untouched — this only reads.
 */
@Service
public class ChatExtractionService {

    private static final Logger log = LoggerFactory.getLogger(ChatExtractionService.class);
    private static final DateTimeFormatter LINE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final int CHUNK_CHARS = 9000;

    private final ChatArchiveRepository archiveRepo;
    private final ChatMessageRepository messageRepo;
    private final PersonRepository personRepo;
    private final FactRepository factRepo;
    private final EpisodeRepository episodeRepo;
    private final AnthropicClient llm;
    private final CompanionService companionService;
    private final ObjectMapper om = new ObjectMapper();

    public ChatExtractionService(ChatArchiveRepository archiveRepo, ChatMessageRepository messageRepo,
                                 PersonRepository personRepo, FactRepository factRepo,
                                 EpisodeRepository episodeRepo, AnthropicClient llm,
                                 CompanionService companionService) {
        this.archiveRepo = archiveRepo;
        this.messageRepo = messageRepo;
        this.personRepo = personRepo;
        this.factRepo = factRepo;
        this.episodeRepo = episodeRepo;
        this.llm = llm;
        this.companionService = companionService;
    }

    public boolean isLlmConfigured() { return llm.isConfigured(); }

    @Async
    public void extractAsync(UUID archiveId) {
        ChatArchive archive = archiveRepo.findWithPerson(archiveId).orElse(null);
        if (archive == null) { log.warn("Extraction: archive {} not found", archiveId); return; }

        archive.setExtractionStatus(ChatArchive.ExtractionStatus.EXTRACTING);
        archiveRepo.save(archive);
        try {
            int[] saved = doExtract(archive);
            archive.setExtractionStatus(ChatArchive.ExtractionStatus.DONE);
            archiveRepo.save(archive);
            log.info("Extraction DONE for archive {}: {} facts, {} episodes", archiveId, saved[0], saved[1]);

            // Best-effort: refresh voice/interaction style profile from all archives
            try {
                companionService.analyzeStyle(archive.getPerson().getId());
                log.info("Style profile refreshed for person {}", archive.getPerson().getId());
            } catch (Exception e) {
                log.warn("Style analysis skipped: {}", e.getMessage());
            }
        } catch (Exception e) {
            log.error("Extraction FAILED for archive {}", archiveId, e);
            archive.setExtractionStatus(ChatArchive.ExtractionStatus.ERROR);
            archiveRepo.save(archive);
        }
    }

    private int[] doExtract(ChatArchive archive) throws Exception {
        Person person = archive.getPerson();
        String personName = person.getDisplayName() != null ? person.getDisplayName() : person.getName();
        String selfName = personRepo.findByIsSelfTrue()
            .map(p -> p.getDisplayName() != null ? p.getDisplayName() : p.getName())
            .orElse("Tôi");

        List<ChatMessage> messages = messageRepo.findByChatArchiveIdOrderBySeqAsc(archive.getId());
        if (messages.isEmpty()) return new int[]{0, 0};

        // ── Chunk by original order ──────────────────────────────────────────
        List<List<ChatMessage>> chunks = new ArrayList<>();
        List<ChatMessage> current = new ArrayList<>();
        int chars = 0;
        for (ChatMessage m : messages) {
            current.add(m);
            chars += (m.getContent() != null ? m.getContent().length() : 0) + 30;
            if (chars >= CHUNK_CHARS) {
                chunks.add(current);
                current = new ArrayList<>();
                chars = 0;
            }
        }
        if (!current.isEmpty()) chunks.add(current);

        // ── Dedupe sets (existing memory + within this run) ─────────────────
        Set<String> factKeys = new HashSet<>();
        for (Fact f : factRepo.findByPersonId(person.getId()))
            factKeys.add((f.getCategory() + "|" + f.getKey()).toLowerCase());
        Set<String> episodeSummaries = new HashSet<>();
        for (Episode e : episodeRepo.findByPersonIdOrderByOccurredAtDesc(person.getId()))
            if (e.getSummary() != null) episodeSummaries.add(e.getSummary().trim().toLowerCase());

        String system = buildSystemPrompt(selfName, personName);
        int savedFacts = 0, savedEpisodes = 0;

        for (int i = 0; i < chunks.size(); i++) {
            List<ChatMessage> chunk = chunks.get(i);
            String block = renderChunk(chunk, selfName, personName);
            LocalDateTime chunkStart = chunk.get(0).getTimestamp();

            String reply;
            try {
                reply = llm.complete(system, block, 3000);
            } catch (Exception e) {
                log.warn("Chunk {}/{} LLM call failed, skipping: {}", i + 1, chunks.size(), e.getMessage());
                continue;
            }

            JsonNode root = parseJson(reply);
            if (root == null) { log.warn("Chunk {}/{}: unparseable reply", i + 1, chunks.size()); continue; }

            for (JsonNode f : root.path("facts")) {
                String category = f.path("category").asText("basic").toLowerCase();
                String key = f.path("key").asText("").trim();
                String value = f.path("value").asText("").trim();
                if (key.isEmpty() || value.isEmpty()) continue;
                String dk = (category + "|" + key).toLowerCase();
                if (!factKeys.add(dk)) continue;

                Fact fact = new Fact();
                fact.setPerson(person);
                fact.setCategory(category);
                fact.setKey(key);
                fact.setValue(value);
                fact.setPeriod(f.hasNonNull("period") ? f.path("period").asText() : null);
                fact.setConfidence((float) f.path("confidence").asDouble(0.7));
                fact.setSourceArchiveId(archive.getId());
                factRepo.save(fact);
                savedFacts++;
            }

            for (JsonNode ep : root.path("episodes")) {
                String summary = ep.path("summary").asText("").trim();
                if (summary.isEmpty()) continue;
                if (!episodeSummaries.add(summary.toLowerCase())) continue;

                Episode episode = new Episode();
                episode.setPerson(person);
                episode.setSummary(summary);
                episode.setEmotion(ep.hasNonNull("emotion") ? ep.path("emotion").asText() : null);
                int imp = ep.path("importance").asInt(5);
                episode.setImportance(Math.min(10, Math.max(1, imp)));
                episode.setOccurredAt(parseOccurredAt(ep.path("occurredAt").asText(null), chunkStart));
                episode.setSourceArchiveId(archive.getId());
                episodeRepo.save(episode);
                savedEpisodes++;
            }

            log.info("Extraction {}/{} for archive {}: totals {} facts, {} episodes",
                i + 1, chunks.size(), archive.getId(), savedFacts, savedEpisodes);
            Thread.sleep(400); // gentle pacing
        }
        return new int[]{savedFacts, savedEpisodes};
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String buildSystemPrompt(String selfName, String personName) {
        return "Bạn là công cụ trích xuất ký ức từ log chat Yahoo Messenger tiếng Việt (thời 2008-2012, nhiều teencode, thiếu dấu).\n" +
            "Đoạn chat là giữa \"" + selfName + "\" (tôi) và \"" + personName + "\".\n\n" +
            "Trích xuất:\n" +
            "1. facts — thông tin ổn định VỀ " + personName + " (KHÔNG phải về " + selfName + "):\n" +
            "   - category: basic | preference | habit | work | family | hobby\n" +
            "   - key: ngắn gọn dạng snake_case không dấu (vd: truong_hoc, mon_an_thich)\n" +
            "   - value: tiếng Việt tự nhiên có dấu\n" +
            "   - period: \"2010\" hoặc \"2009-2011\" nếu chỉ đúng trong giai đoạn, null nếu luôn đúng\n" +
            "   - confidence: 0.1-1.0 theo độ chắc chắn từ ngữ cảnh\n" +
            "2. episodes — sự kiện/kỷ niệm CỤ THỂ (hẹn gặp, cãi nhau, sinh nhật, thi cử, ốm đau, biến cố...):\n" +
            "   - summary: 1-2 câu tiếng Việt có dấu, đủ ngữ cảnh đọc lại sau 10 năm vẫn hiểu\n" +
            "   - emotion: 1 từ (vui, buồn, giận, nhớ, lo, ngại...)\n" +
            "   - importance: 1-10 (10 = bước ngoặt)\n" +
            "   - occurredAt: \"yyyy-MM-dd\" theo ngày hiện trong log, null nếu không rõ\n\n" +
            "Bỏ qua small talk vô nghĩa. Không suy diễn quá những gì log thể hiện.\n" +
            "Nếu đoạn này không có gì đáng lưu: trả mảng rỗng.\n" +
            "CHỈ trả về JSON đúng schema sau, không markdown, không lời giải thích:\n" +
            "{\"facts\":[{\"category\":\"...\",\"key\":\"...\",\"value\":\"...\",\"period\":null,\"confidence\":0.8}]," +
            "\"episodes\":[{\"summary\":\"...\",\"emotion\":\"...\",\"importance\":5,\"occurredAt\":\"2010-05-20\"}]}";
    }

    private String renderChunk(List<ChatMessage> chunk, String selfName, String personName) {
        StringBuilder sb = new StringBuilder("Đoạn chat:\n");
        for (ChatMessage m : chunk) {
            String who = m.getSenderType() == ChatMessage.SenderType.SELF ? selfName : personName;
            String ts = m.getTimestamp() != null ? m.getTimestamp().format(LINE_FMT) : "";
            sb.append('[').append(ts).append("] ").append(who).append(": ").append(m.getContent()).append('\n');
        }
        return sb.toString();
    }

    private JsonNode parseJson(String reply) {
        if (reply == null) return null;
        String cleaned = reply.trim()
            .replaceAll("^```json\\s*", "").replaceAll("^```\\s*", "").replaceAll("```\\s*$", "").trim();
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        if (start < 0 || end <= start) return null;
        try { return om.readTree(cleaned.substring(start, end + 1)); }
        catch (Exception e) { return null; }
    }

    private LocalDateTime parseOccurredAt(String raw, LocalDateTime fallback) {
        if (raw == null || raw.isBlank() || "null".equals(raw)) return fallback;
        try { return LocalDate.parse(raw.trim()).atStartOfDay(); }
        catch (Exception e) { return fallback; }
    }
}
