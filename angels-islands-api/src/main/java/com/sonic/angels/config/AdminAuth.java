package com.sonic.angels.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Single shared admin token (ADMIN_TOKEN). When it is not set the API behaves as before
 * (everything open) except the importer, which refuses to run without it.
 */
@Component
public class AdminAuth {

    public static final String HEADER = "X-Admin-Token";
    static final String REQUEST_ATTR = "angels.admin";

    private final byte[] token;

    public AdminAuth(@Value("${admin.token:}") String token) {
        String t = token == null ? "" : token.trim();
        this.token = t.isEmpty() ? null : t.getBytes(StandardCharsets.UTF_8);
    }

    public boolean isConfigured() { return token != null; }

    public boolean matches(String candidate) {
        if (token == null || candidate == null || candidate.isBlank()) return false;
        return MessageDigest.isEqual(token, candidate.trim().getBytes(StandardCharsets.UTF_8));
    }

    /** Token from X-Admin-Token or "Authorization: Bearer ...". */
    public String tokenFrom(HttpServletRequest req) {
        String h = req.getHeader(HEADER);
        if (h != null && !h.isBlank()) return h;
        String a = req.getHeader("Authorization");
        if (a != null && a.regionMatches(true, 0, "Bearer ", 0, 7)) return a.substring(7);
        return null;
    }

    /** True when the current request may see private data (always true while no token is configured). */
    public boolean isAdminRequest() {
        if (!isConfigured()) return true;
        var attrs = RequestContextHolder.getRequestAttributes();
        if (!(attrs instanceof ServletRequestAttributes sra)) return false;
        return Boolean.TRUE.equals(sra.getRequest().getAttribute(REQUEST_ATTR));
    }
}
