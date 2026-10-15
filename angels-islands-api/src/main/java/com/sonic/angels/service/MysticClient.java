package com.sonic.angels.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

/** Tells the Mystic service (MYSTIC_API_URL) when a person changed or was deleted here, so its copy of a linked
 *  person's name and birth stays right. Fire and forget: Mystic answers 404 for people it has not linked, and a
 *  failure is only logged (the owner can refresh the person from Mystic). */
@Service
public class MysticClient {

    private static final Logger log = LoggerFactory.getLogger(MysticClient.class);

    private final String base;
    private final String token;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public MysticClient(@Value("${mystic.api-url:}") String base, @Value("${mystic.sync-token:}") String token, ObjectMapper json) {
        this.base = base == null ? "" : base.trim().replaceAll("/+$", "");
        this.token = token == null ? "" : token.trim();
        this.json = json;
    }

    public boolean isConfigured() { return !base.isEmpty() && !token.isEmpty(); }

    /** person: the full detail, birth time and place included */
    public void personChanged(UUID id, Object person) { send("PUT", "/api/links/sonic-hub/" + id, person); }

    public void personDeleted(UUID id) { send("DELETE", "/api/links/sonic-hub/" + id, null); }

    private void send(String method, String path, Object body) {
        if (!isConfigured()) return;
        try {
            HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(base + path)).timeout(Duration.ofSeconds(20)).header("x-sync-token", token);
            if (body == null) b.method(method, HttpRequest.BodyPublishers.noBody());
            else b.header("content-type", "application/json").method(method, HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
            http.sendAsync(b.build(), HttpResponse.BodyHandlers.ofString()).whenComplete((res, err) -> {
                if (err != null) log.warn("Mystic {} {} failed: {}", method, path, err.getMessage());
                else if (res.statusCode() >= 400 && res.statusCode() != 404) log.warn("Mystic {} {}: {} {}", method, path, res.statusCode(), res.body());
            });
        } catch (Exception e) {
            log.warn("Mystic {} {} not sent: {}", method, path, e.getMessage());
        }
    }
}
