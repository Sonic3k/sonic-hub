package com.sonic.connector.companion;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.List;

@Component
@ConditionalOnBean(CompanionConfig.class)
@Slf4j
public class CompanionApiClient {

    private final RestClient restClient;

    public CompanionApiClient(CompanionConfig config) {
        this.restClient = RestClient.builder()
                .baseUrl(config.getApiUrl())
                .build();
        log.info("Companion API client initialized: {}", config.getApiUrl());
    }

    public ChatResponse chat(String channel, String externalId, String message) {
        var request = new ChatRequest(channel, externalId, message, null, Instant.now().toString(), null);
        return restClient.post()
                .uri("/chat")
                .header("Content-Type", "application/json")
                .body(request)
                .retrieve()
                .body(ChatResponse.class);
    }

    // ─── DTOs ───

    @Data
    public static class ChatRequest {
        private final String channel;
        @JsonProperty("external_id")
        private final String externalId;
        private final String message;
        @JsonProperty("assistant_id")
        private final String assistantId;
        private final String timestamp;
        private final Object metadata;
    }

    @Data
    public static class ChatResponse {
        private String reply;
        @JsonProperty("typing_delay_ms")
        private int typingDelayMs;
        private List<String> split;
        @JsonProperty("conversation_id")
        private String conversationId;
        @JsonProperty("assistant_id")
        private String assistantId;
        @JsonProperty("assistant_nickname")
        private String assistantNickname;
    }
}
