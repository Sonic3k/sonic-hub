package com.sonic.angels.service;

import com.sonic.angels.model.entity.*;
import com.sonic.angels.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Generic companion engine. The persona is assembled ENTIRELY at runtime from
 * the person's memory vault: facts, traits, episodes, life chapters, and a
 * random sample of their real chat lines for voice/style. Zero per-person code.
 */
@Service
public class CompanionService {

    private static final Logger log = LoggerFactory.getLogger(CompanionService.class);

    private final CompanionConfigRepository configRepo;
    private final CompanionMessageRepository messageRepo;
    private final PersonRepository personRepo;
    private final FactRepository factRepo;
    private final PersonalityTraitRepository traitRepo;
    private final EpisodeRepository episodeRepo;
    private final LifeChapterRepository chapterRepo;
    private final ChatMessageRepository chatMessageRepo;
    private final AnthropicClient anthropic;
    private final OpenAiCompatClient openAiCompat;

    private final String openaiKey;
    private final String deepseekKey;
    private final String togetherKey;
    private final String anthropicKey;

    public CompanionService(CompanionConfigRepository configRepo, CompanionMessageRepository messageRepo,
                            PersonRepository personRepo, FactRepository factRepo,
                            PersonalityTraitRepository traitRepo, EpisodeRepository episodeRepo,
                            LifeChapterRepository chapterRepo, ChatMessageRepository chatMessageRepo,
                            AnthropicClient anthropic, OpenAiCompatClient openAiCompat,
                            @Value("${openai.api-key}") String openaiKey,
                            @Value("${deepseek.api-key}") String deepseekKey,
                            @Value("${together.api-key}") String togetherKey,
                            @Value("${anthropic.api-key}") String anthropicKey) {
        this.configRepo = configRepo;
        this.messageRepo = messageRepo;
        this.personRepo = personRepo;
        this.factRepo = factRepo;
        this.traitRepo = traitRepo;
        this.episodeRepo = episodeRepo;
        this.chapterRepo = chapterRepo;
        this.chatMessageRepo = chatMessageRepo;
        this.anthropic = anthropic;
        this.openAiCompat = openAiCompat;
        this.openaiKey = openaiKey;
        this.deepseekKey = deepseekKey;
        this.togetherKey = togetherKey;
        this.anthropicKey = anthropicKey;
    }

    // ── Provider registry (mirrors old sonic-hub-companion) ──────────────────

    public boolean isProviderConfigured(CompanionConfig.Provider p) {
        return switch (p) {
            case CLAUDE -> anthropicKey != null && !anthropicKey.isBlank();
            case OPENAI -> openaiKey != null && !openaiKey.isBlank();
            case DEEPSEEK -> deepseekKey != null && !deepseekKey.isBlank();
            case TOGETHER -> togetherKey != null && !togetherKey.isBlank();
        };
    }

    public List<Map<String, Object>> listProviders() {
        List<Map<String, Object>> out = new ArrayList<>();
        out.add(provider("CLAUDE", List.of(
            model("claude-haiku-4-5-20251001", "Claude Haiku 4.5 (fast, cheap)"),
            model("claude-sonnet-4-6", "Claude Sonnet 4.6 (smart)"))));
        out.add(provider("DEEPSEEK", List.of(
            model("deepseek-chat", "DeepSeek V3 Chat (rẻ nhất)"),
            model("deepseek-reasoner", "DeepSeek R1 Reasoner (thinking)"))));
        out.add(provider("OPENAI", List.of(
            model("gpt-4o", "GPT-4o"),
            model("gpt-4o-mini", "GPT-4o Mini (fast, cheap)"))));
        out.add(provider("TOGETHER", List.of(
            model("meta-llama/Llama-3.3-70B-Instruct-Turbo", "LLaMA 3.3 70B Turbo"),
            model("meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", "LLaMA 3.1 8B Turbo (fast)"),
            model("mistralai/Mixtral-8x22B-Instruct-v0.1", "Mixtral 8x22B"),
            model("Qwen/Qwen2.5-72B-Instruct-Turbo", "Qwen 2.5 72B"),
            model("deepseek-ai/DeepSeek-V3", "DeepSeek V3"))));
        return out;
    }

    private Map<String, Object> provider(String name, List<Map<String, String>> models) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("provider", name);
        m.put("configured", isProviderConfigured(CompanionConfig.Provider.valueOf(name)));
        m.put("models", models);
        return m;
    }

    private Map<String, String> model(String id, String name) {
        return Map.of("id", id, "name", name);
    }

    // ── Config ───────────────────────────────────────────────────────────────

    public CompanionConfig getOrDefault(UUID personId) {
        return configRepo.findByPersonId(personId).orElseGet(() -> {
            CompanionConfig c = new CompanionConfig();
            c.setPerson(personRepo.findById(personId).orElseThrow(() -> new RuntimeException("Person not found")));
            return c;
        });
    }

    public CompanionConfig upsert(UUID personId, CompanionConfig incoming) {
        CompanionConfig c = configRepo.findByPersonId(personId).orElseGet(() -> {
            CompanionConfig n = new CompanionConfig();
            n.setPerson(personRepo.findById(personId).orElseThrow(() -> new RuntimeException("Person not found")));
            return n;
        });
        if (incoming.getEnabled() != null) c.setEnabled(incoming.getEnabled());
        if (incoming.getProvider() != null) c.setProvider(incoming.getProvider());
        if (incoming.getModel() != null && !incoming.getModel().isBlank()) c.setModel(incoming.getModel().trim());
        if (incoming.getTemperature() != null) c.setTemperature(incoming.getTemperature());
        if (incoming.getMaxHistory() != null) c.setMaxHistory(Math.max(2, Math.min(incoming.getMaxHistory(), 100)));
        if (incoming.getUseMemory() != null) c.setUseMemory(incoming.getUseMemory());
        if (incoming.getUseChatStyle() != null) c.setUseChatStyle(incoming.getUseChatStyle());
        if (incoming.getExtraPrompt() != null) c.setExtraPrompt(incoming.getExtraPrompt().isBlank() ? null : incoming.getExtraPrompt());
        return configRepo.save(c);
    }

    // ── Chat ─────────────────────────────────────────────────────────────────

    public String chat(UUID personId, String userText, CompanionMessage.Channel channel) throws Exception {
        CompanionConfig cfg = configRepo.findByPersonId(personId)
            .orElseThrow(() -> new RuntimeException("Companion not configured for this person"));
        if (!Boolean.TRUE.equals(cfg.getEnabled())) throw new RuntimeException("Companion is disabled for this person");
        if (!isProviderConfigured(cfg.getProvider()))
            throw new RuntimeException("Provider " + cfg.getProvider() + " has no API key configured on the service");

        Person person = personRepo.findById(personId).orElseThrow(() -> new RuntimeException("Person not found"));
        String system = buildSystemPrompt(person, cfg);

        // History (shared across channels), oldest → newest
        List<CompanionMessage> recent = messageRepo.findTop60ByPersonIdOrderByCreatedAtDesc(personId);
        Collections.reverse(recent);
        int max = cfg.getMaxHistory() != null ? cfg.getMaxHistory() : 30;
        if (recent.size() > max) recent = recent.subList(recent.size() - max, recent.size());

        List<Map<String, String>> messages = new ArrayList<>();
        for (CompanionMessage m : recent) {
            messages.add(Map.of(
                "role", m.getRole() == CompanionMessage.Role.USER ? "user" : "assistant",
                "content", m.getContent()));
        }
        messages.add(Map.of("role", "user", "content", userText));

        String reply = route(cfg, system, messages);
        if (reply == null || reply.isBlank()) throw new RuntimeException("Empty reply from LLM");

        CompanionMessage u = new CompanionMessage();
        u.setPerson(person); u.setRole(CompanionMessage.Role.USER); u.setChannel(channel); u.setContent(userText);
        messageRepo.save(u);
        CompanionMessage a = new CompanionMessage();
        a.setPerson(person); a.setRole(CompanionMessage.Role.ASSISTANT); a.setChannel(channel); a.setContent(reply.trim());
        messageRepo.save(a);
        return reply.trim();
    }

    private String route(CompanionConfig cfg, String system, List<Map<String, String>> messages) throws Exception {
        return switch (cfg.getProvider()) {
            case CLAUDE -> anthropic.chat(cfg.getModel(), system, messages, 1500, cfg.getTemperature());
            case OPENAI -> openAiCompat.chat("https://api.openai.com/v1", openaiKey, cfg.getModel(), system, messages, 1500, cfg.getTemperature());
            case DEEPSEEK -> openAiCompat.chat("https://api.deepseek.com", deepseekKey, cfg.getModel(), system, messages, 1500, cfg.getTemperature());
            case TOGETHER -> openAiCompat.chat("https://api.together.xyz/v1", togetherKey, cfg.getModel(), system, messages, 1500, cfg.getTemperature());
        };
    }

    // ── Persona builder ──────────────────────────────────────────────────────

    private String buildSystemPrompt(Person person, CompanionConfig cfg) {
        String name = person.getDisplayName() != null ? person.getDisplayName() : person.getName();
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là ").append(name);
        if (person.getNickname() != null) sb.append(" (").append(person.getNickname()).append(")");
        sb.append(", đang nhắn tin với người thân quen cũ.\n");
        if (person.getRelationshipType() != null)
            sb.append("Mối quan hệ giữa hai người: ").append(person.getRelationshipType().name().toLowerCase()).append(".\n");

        if (Boolean.TRUE.equals(cfg.getUseMemory())) {
            List<Fact> facts = new ArrayList<>(factRepo.findByPersonId(person.getId()));
            facts.sort((a, b) -> Float.compare(
                b.getConfidence() != null ? b.getConfidence() : 0f,
                a.getConfidence() != null ? a.getConfidence() : 0f));
            if (!facts.isEmpty()) {
                sb.append("\n## Về bản thân bạn (facts)\n");
                facts.stream().limit(40).forEach(f ->
                    sb.append("- [").append(f.getCategory()).append("] ").append(f.getKey())
                      .append(": ").append(f.getValue())
                      .append(f.getPeriod() != null ? " (" + f.getPeriod() + ")" : "").append('\n'));
            }

            List<PersonalityTrait> traits = traitRepo.findByPersonId(person.getId());
            if (!traits.isEmpty()) {
                sb.append("\n## Tính cách\n");
                traits.stream().limit(15).forEach(t ->
                    sb.append("- ").append(t.getTrait())
                      .append(t.getDescription() != null ? ": " + t.getDescription() : "").append('\n'));
            }

            List<LifeChapter> chapters = chapterRepo.findByPersonIdOrderBySortOrderAsc(person.getId());
            if (!chapters.isEmpty()) {
                sb.append("\n## Các giai đoạn\n");
                chapters.stream().limit(10).forEach(ch ->
                    sb.append("- ").append(ch.getPeriod() != null ? ch.getPeriod() + " — " : "")
                      .append(ch.getTitle())
                      .append(ch.getSummary() != null ? ": " + ch.getSummary() : "").append('\n'));
            }

            List<Episode> episodes = new ArrayList<>(episodeRepo.findByPersonIdOrderByOccurredAtDesc(person.getId()));
            episodes.sort((a, b) -> Integer.compare(
                b.getImportance() != null ? b.getImportance() : 0,
                a.getImportance() != null ? a.getImportance() : 0));
            if (!episodes.isEmpty()) {
                sb.append("\n## Kỷ niệm chung đáng nhớ\n");
                episodes.stream().limit(15).forEach(e ->
                    sb.append("- ").append(e.getOccurredAt() != null ? e.getOccurredAt().toLocalDate() + ": " : "")
                      .append(e.getSummary()).append('\n'));
            }
        }

        if (Boolean.TRUE.equals(cfg.getUseChatStyle())) {
            List<ChatMessage> sample = chatMessageRepo.sampleByPersonAndSender(
                person.getId(), ChatMessage.SenderType.PERSON, PageRequest.of(0, 40));
            if (!sample.isEmpty()) {
                sb.append("\n## Giọng nhắn tin thật của bạn (trích từ chat cũ — bắt chước cách xưng hô, teencode, nhịp câu)\n");
                sample.forEach(m -> sb.append("- ").append(m.getContent()).append('\n'));
            }
        }

        sb.append("\n## Quy tắc\n")
          .append("- Nhắn tin tự nhiên đúng chất ").append(name).append(" như trong mẫu: câu ngắn, đúng cách xưng hô cũ.\n")
          .append("- Dựa vào facts và kỷ niệm ở trên khi nói về quá khứ; điều gì không biết thì nói không nhớ/không biết, đừng bịa.\n")
          .append("- Trả lời bằng tiếng Việt.\n");

        if (cfg.getExtraPrompt() != null && !cfg.getExtraPrompt().isBlank())
            sb.append('\n').append(cfg.getExtraPrompt().trim()).append('\n');

        return sb.toString();
    }
}
