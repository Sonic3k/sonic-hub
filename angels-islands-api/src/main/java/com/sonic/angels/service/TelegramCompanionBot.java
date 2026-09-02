package com.sonic.angels.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonic.angels.model.entity.CompanionConfig;
import com.sonic.angels.model.entity.CompanionMessage;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.model.entity.TelegramCompanionSession;
import com.sonic.angels.repository.CompanionConfigRepository;
import com.sonic.angels.repository.TelegramCompanionSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;

/**
 * Companion over Telegram. Own bot token (separate from sonic-hub-connector),
 * simple long-polling loop. One active person per Telegram chat, switched
 * with /talk. All conversation history is shared with the in-app chat.
 */
@Service
public class TelegramCompanionBot {

    private static final Logger log = LoggerFactory.getLogger(TelegramCompanionBot.class);

    private final String token;
    private final CompanionService companionService;
    private final CompanionConfigRepository configRepo;
    private final TelegramCompanionSessionRepository sessionRepo;
    private final ObjectMapper om = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private long offset = 0;

    public TelegramCompanionBot(@Value("${telegram.companion-bot-token}") String token,
                                CompanionService companionService,
                                CompanionConfigRepository configRepo,
                                TelegramCompanionSessionRepository sessionRepo) {
        this.token = token;
        this.companionService = companionService;
        this.configRepo = configRepo;
        this.sessionRepo = sessionRepo;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        if (token == null || token.isBlank()) {
            log.info("Telegram companion bot: no token, disabled");
            return;
        }
        Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "tg-companion");
            t.setDaemon(true);
            return t;
        }).submit(this::pollLoop);
        log.info("Telegram companion bot: polling started");
    }

    private void pollLoop() {
        while (true) {
            try {
                String url = api("getUpdates") + "?timeout=25&offset=" + (offset + 1);
                HttpRequest req = HttpRequest.newBuilder().uri(URI.create(url))
                    .timeout(Duration.ofSeconds(35)).GET().build();
                HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
                JsonNode root = om.readTree(resp.body());
                for (JsonNode upd : root.path("result")) {
                    offset = Math.max(offset, upd.path("update_id").asLong());
                    JsonNode msg = upd.path("message");
                    if (msg.isMissingNode() || !msg.has("text")) continue;
                    long chatId = msg.path("chat").path("id").asLong();
                    String text = msg.path("text").asText().trim();
                    try {
                        handle(chatId, text);
                    } catch (Exception e) {
                        log.warn("Telegram handle error", e);
                        send(chatId, "Lỗi: " + e.getMessage());
                    }
                }
            } catch (Exception e) {
                log.warn("Telegram poll error: {}", e.getMessage());
                try { Thread.sleep(3000); } catch (InterruptedException ie) { return; }
            }
        }
    }

    private void handle(long chatId, String text) throws Exception {
        if (text.startsWith("/start") || text.startsWith("/help")) {
            send(chatId, """
                Angels Islands companion.
                /companions — danh sách người đã bật companion
                /talk <tên> — chọn người để nhắn
                /who — đang nhắn với ai
                Sau đó cứ nhắn bình thường.""");
            return;
        }
        if (text.startsWith("/companions")) {
            List<CompanionConfig> enabled = configRepo.findAllEnabled();
            if (enabled.isEmpty()) { send(chatId, "Chưa ai được bật companion."); return; }
            StringBuilder sb = new StringBuilder("Đang bật:\n");
            for (CompanionConfig c : enabled) {
                Person p = c.getPerson();
                sb.append("• ").append(p.getDisplayName() != null ? p.getDisplayName() : p.getName())
                  .append(" (").append(c.getProvider()).append('/').append(c.getModel()).append(")\n");
            }
            sb.append("\nDùng /talk <tên> để chọn.");
            send(chatId, sb.toString());
            return;
        }
        if (text.startsWith("/talk")) {
            String q = text.replaceFirst("/talk", "").trim().toLowerCase();
            if (q.isEmpty()) { send(chatId, "Dùng: /talk <tên>"); return; }
            CompanionConfig match = configRepo.findAllEnabled().stream()
                .filter(c -> {
                    Person p = c.getPerson();
                    String n1 = p.getName() != null ? p.getName().toLowerCase() : "";
                    String n2 = p.getDisplayName() != null ? p.getDisplayName().toLowerCase() : "";
                    String n3 = p.getNickname() != null ? p.getNickname().toLowerCase() : "";
                    return n1.contains(q) || n2.contains(q) || n3.contains(q);
                })
                .findFirst().orElse(null);
            if (match == null) { send(chatId, "Không tìm thấy companion nào khớp \"" + q + "\"."); return; }
            TelegramCompanionSession s = new TelegramCompanionSession();
            s.setChatId(chatId);
            s.setPersonId(match.getPerson().getId());
            sessionRepo.save(s);
            Person p = match.getPerson();
            send(chatId, "Đang nhắn với " + (p.getDisplayName() != null ? p.getDisplayName() : p.getName()) + ". Nhắn gì đó đi.");
            return;
        }
        if (text.startsWith("/who")) {
            var s = sessionRepo.findById(chatId).orElse(null);
            if (s == null) { send(chatId, "Chưa chọn ai. Dùng /companions rồi /talk <tên>."); return; }
            var cfg = configRepo.findAllEnabled().stream()
                .filter(c -> c.getPerson().getId().equals(s.getPersonId())).findFirst().orElse(null);
            String name = cfg != null
                ? (cfg.getPerson().getDisplayName() != null ? cfg.getPerson().getDisplayName() : cfg.getPerson().getName())
                : "?";
            send(chatId, "Đang nhắn với " + name + ".");
            return;
        }

        UUID personId = sessionRepo.findById(chatId)
            .map(TelegramCompanionSession::getPersonId).orElse(null);
        if (personId == null) {
            send(chatId, "Chưa chọn ai. Dùng /companions rồi /talk <tên>.");
            return;
        }
        sendAction(chatId);
        String reply = companionService.chat(personId, text, CompanionMessage.Channel.TELEGRAM);
        send(chatId, reply);
    }

    private String api(String method) { return "https://api.telegram.org/bot" + token + "/" + method; }

    private void send(long chatId, String text) {
        try {
            for (int i = 0; i < text.length(); i += 4000) {
                String part = text.substring(i, Math.min(text.length(), i + 4000));
                String url = api("sendMessage") + "?chat_id=" + chatId
                    + "&text=" + URLEncoder.encode(part, StandardCharsets.UTF_8);
                http.send(HttpRequest.newBuilder().uri(URI.create(url)).timeout(Duration.ofSeconds(15)).GET().build(),
                    HttpResponse.BodyHandlers.discarding());
            }
        } catch (Exception e) {
            log.warn("Telegram send failed: {}", e.getMessage());
        }
    }

    private void sendAction(long chatId) {
        try {
            String url = api("sendChatAction") + "?chat_id=" + chatId + "&action=typing";
            http.send(HttpRequest.newBuilder().uri(URI.create(url)).timeout(Duration.ofSeconds(10)).GET().build(),
                HttpResponse.BodyHandlers.discarding());
        } catch (Exception ignored) {}
    }
}
