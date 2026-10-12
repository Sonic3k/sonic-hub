package com.sonic.angels.controller;

import com.sonic.angels.service.FinanceIngestService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

/**
 * SePay posts every transaction of a linked account here. SePay counts a delivery as done only on HTTP 200/201
 * with {"success": true}, so that is the answer even for a duplicate or a payload that could not be used
 * (those are kept in the webhook log instead of being retried for hours).
 *
 * Optional protection: with SEPAY_API_KEY set, the request must carry "Authorization: Apikey <key>" — the
 * "API Key" option in SePay's webhook form. This path is outside the admin token on purpose.
 */
@RestController
@RequestMapping("/api/finance/hooks")
public class FinanceHookController {

    private final FinanceIngestService ingest;
    private final byte[] key;

    public FinanceHookController(FinanceIngestService ingest, @Value("${finance.sepay.api-key:}") String key) {
        this.ingest = ingest;
        String k = key == null ? "" : key.trim();
        this.key = k.isEmpty() ? null : k.getBytes(StandardCharsets.UTF_8);
    }

    @PostMapping("/sepay")
    public ResponseEntity<Map<String, Object>> sepay(@RequestBody(required = false) String body,
                                                     @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (key != null && !authorized(authorization))
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "wrong or missing Apikey"));
        ingest.receiveSepay(body);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /** Open the URL in a browser to check it is reachable. */
    @GetMapping("/sepay")
    public Map<String, Object> ping() { return Map.of("ok", true, "keyRequired", key != null); }

    private boolean authorized(String header) {
        if (header == null) return false;
        String h = header.trim();
        int sp = h.indexOf(' ');
        if (sp < 0) return false;
        String scheme = h.substring(0, sp), value = h.substring(sp + 1).trim();
        if (!scheme.equalsIgnoreCase("Apikey") && !scheme.equalsIgnoreCase("Bearer")) return false;
        return MessageDigest.isEqual(key, value.getBytes(StandardCharsets.UTF_8));
    }
}
