package com.sonic.angels.controller;

import com.sonic.angels.model.entity.CompanionConfig;
import com.sonic.angels.model.entity.CompanionMessage;
import com.sonic.angels.repository.CompanionMessageRepository;
import com.sonic.angels.service.CompanionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class CompanionController {

    private final CompanionService companionService;
    private final CompanionMessageRepository messageRepo;
    private final String telegramToken;

    public CompanionController(CompanionService companionService, CompanionMessageRepository messageRepo,
                               @org.springframework.beans.factory.annotation.Value("${telegram.companion-bot-token}") String telegramToken) {
        this.companionService = companionService;
        this.messageRepo = messageRepo;
        this.telegramToken = telegramToken;
    }

    @GetMapping("/companion/providers")
    public List<Map<String, Object>> providers() { return companionService.listProviders(); }

    @GetMapping("/persons/{personId}/companion")
    public Map<String, Object> getConfig(@PathVariable UUID personId) {
        return toDto(companionService.getOrDefault(personId));
    }

    @PutMapping("/persons/{personId}/companion")
    public Map<String, Object> saveConfig(@PathVariable UUID personId, @RequestBody ConfigRequest req) {
        CompanionConfig incoming = new CompanionConfig();
        incoming.setEnabled(req.enabled);
        if (req.provider != null) incoming.setProvider(CompanionConfig.Provider.valueOf(req.provider.toUpperCase()));
        incoming.setModel(req.model);
        incoming.setTemperature(req.temperature);
        incoming.setMaxHistory(req.maxHistory);
        incoming.setUseMemory(req.useMemory);
        incoming.setUseChatStyle(req.useChatStyle);
        incoming.setExtraPrompt(req.extraPrompt);
        incoming.setStyleProfile(req.styleProfile);
        return toDto(companionService.upsert(personId, incoming));
    }

    @GetMapping("/persons/{personId}/companion/messages")
    public Page<Map<String, Object>> messages(@PathVariable UUID personId,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "50") int size) {
        return messageRepo.findByPersonId(personId,
                PageRequest.of(page, Math.min(size, 200), Sort.by(Sort.Direction.DESC, "createdAt")))
            .map(this::msgDto);
    }

    @GetMapping("/persons/{personId}/companion/persona-preview")
    public Map<String, String> personaPreview(@PathVariable UUID personId) {
        return Map.of("prompt", companionService.previewPersona(personId));
    }

    @PostMapping("/persons/{personId}/companion/analyze-style")
    public Map<String, String> analyzeStyle(@PathVariable UUID personId) throws Exception {
        return Map.of("styleProfile", companionService.analyzeStyle(personId));
    }

    @PostMapping("/persons/{personId}/companion/chat")
    public Map<String, String> chat(@PathVariable UUID personId, @RequestBody ChatRequest req) throws Exception {
        String reply = companionService.chat(personId, req.message, CompanionMessage.Channel.APP);
        return Map.of("reply", reply);
    }

    @DeleteMapping("/persons/{personId}/companion/messages")
    public Map<String, String> clear(@PathVariable UUID personId) {
        messageRepo.deleteByPersonId(personId);
        return Map.of("status", "cleared");
    }

    private Map<String, Object> toDto(CompanionConfig c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("enabled", c.getEnabled());
        m.put("provider", c.getProvider().name());
        m.put("model", c.getModel());
        m.put("temperature", c.getTemperature());
        m.put("maxHistory", c.getMaxHistory());
        m.put("useMemory", c.getUseMemory());
        m.put("useChatStyle", c.getUseChatStyle());
        m.put("extraPrompt", c.getExtraPrompt());
        m.put("styleProfile", c.getStyleProfile());
        m.put("providerConfigured", companionService.isProviderConfigured(c.getProvider()));
        m.put("telegramConfigured", telegramToken != null && !telegramToken.isBlank());
        return m;
    }

    private Map<String, Object> msgDto(CompanionMessage m) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", m.getId());
        out.put("role", m.getRole().name());
        out.put("channel", m.getChannel().name());
        out.put("content", m.getContent());
        LocalDateTime t = m.getCreatedAt();
        out.put("createdAt", t);
        return out;
    }

    public static class ConfigRequest {
        public Boolean enabled;
        public String provider;
        public String model;
        public Float temperature;
        public Integer maxHistory;
        public Boolean useMemory;
        public Boolean useChatStyle;
        public String extraPrompt;
        public String styleProfile;
    }

    public static class ChatRequest { public String message; }
}
