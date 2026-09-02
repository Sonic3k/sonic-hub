package com.sonic.angels.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** OpenAI-compatible chat client — covers OpenAI, DeepSeek, Together. */
@Service
public class OpenAiCompatClient {

    private final ObjectMapper om = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    public String chat(String baseUrl, String apiKey, String model, String system,
                       List<Map<String, String>> messages, int maxTokens, Float temperature) throws Exception {
        List<Map<String, String>> all = new ArrayList<>();
        all.add(Map.of("role", "system", "content", system));
        all.addAll(messages);

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", all);
        body.put("max_tokens", maxTokens);
        if (temperature != null) body.put("temperature", temperature);

        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/chat/completions"))
            .timeout(Duration.ofSeconds(120))
            .header("Authorization", "Bearer " + apiKey)
            .header("content-type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(om.writeValueAsString(body)))
            .build();

        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() != 200) {
            String excerpt = resp.body() != null && resp.body().length() > 300
                ? resp.body().substring(0, 300) : resp.body();
            throw new RuntimeException("LLM API " + resp.statusCode() + ": " + excerpt);
        }
        JsonNode root = om.readTree(resp.body());
        return root.path("choices").path(0).path("message").path("content").asText("");
    }
}
