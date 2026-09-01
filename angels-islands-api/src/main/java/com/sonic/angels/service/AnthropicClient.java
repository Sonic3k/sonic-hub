package com.sonic.angels.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/** Minimal Anthropic Messages API client (no SDK dependency). */
@Service
public class AnthropicClient {

    private final String apiKey;
    private final String model;
    private final ObjectMapper om = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    public AnthropicClient(@Value("${anthropic.api-key}") String apiKey,
                           @Value("${anthropic.model}") String model) {
        this.apiKey = apiKey;
        this.model = model;
    }

    public boolean isConfigured() { return apiKey != null && !apiKey.isBlank(); }

    /** One-shot completion: system + single user message → assistant text. */
    public String complete(String system, String user, int maxTokens) throws Exception {
        Map<String, Object> body = Map.of(
            "model", model,
            "max_tokens", maxTokens,
            "system", system,
            "messages", List.of(Map.of("role", "user", "content", user))
        );
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create("https://api.anthropic.com/v1/messages"))
            .timeout(Duration.ofSeconds(180))
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(om.writeValueAsString(body)))
            .build();

        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() != 200) {
            String excerpt = resp.body() != null && resp.body().length() > 300
                ? resp.body().substring(0, 300) : resp.body();
            throw new RuntimeException("Anthropic API " + resp.statusCode() + ": " + excerpt);
        }
        JsonNode root = om.readTree(resp.body());
        StringBuilder sb = new StringBuilder();
        for (JsonNode block : root.path("content")) {
            if ("text".equals(block.path("type").asText())) sb.append(block.path("text").asText());
        }
        return sb.toString();
    }
}
