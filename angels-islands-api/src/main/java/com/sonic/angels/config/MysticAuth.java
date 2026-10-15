package com.sonic.angels.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** The token shared with the Mystic service (MYSTIC_SYNC_TOKEN). Mystic signs its pushes with it, and reading a person
 *  with it shows the birth time and place, which the public does not see. Without a token nothing is accepted. */
@Component
public class MysticAuth {

    public static final String HEADER = "X-Sync-Token";

    private final byte[] token;

    public MysticAuth(@Value("${mystic.sync-token:}") String token) {
        String t = token == null ? "" : token.trim();
        this.token = t.isEmpty() ? null : t.getBytes(StandardCharsets.UTF_8);
    }

    public boolean isConfigured() { return token != null; }

    public boolean matches(String candidate) {
        if (token == null || candidate == null || candidate.isBlank()) return false;
        return MessageDigest.isEqual(token, candidate.trim().getBytes(StandardCharsets.UTF_8));
    }

    /** the current request is Mystic's */
    public boolean isMysticRequest() {
        var attrs = RequestContextHolder.getRequestAttributes();
        return attrs instanceof ServletRequestAttributes sra && matches(sra.getRequest().getHeader(HEADER));
    }
}
