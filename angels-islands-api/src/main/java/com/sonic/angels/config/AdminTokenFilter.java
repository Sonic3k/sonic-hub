package com.sonic.angels.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.regex.Pattern;

/**
 * Off unless ADMIN_TOKEN is set (then the API is open, importer included).
 * With ADMIN_TOKEN set: every write needs the token, and so do reads of private data
 * (chat archives, other chats, memory, contacts, companion, journal problems, imports).
 * Photos, collections, tags and persons stay public for sonic-hub-web; journal notes answer only
 * with published articles to callers without the token (JournalController).
 */
public class AdminTokenFilter extends OncePerRequestFilter {

    private static final Pattern PRIVATE_READ = Pattern.compile(
        "^/api/(persons/[^/]+/(chat-archives|memory|contacts|companion)(/.*)?" +
        "|companion(/.*)?|chat-archives(/.*)?|chat-attachments(/.*)?|journal/(problems|authors)(/.*)?|import(/.*)?)$");

    private final AdminAuth auth;

    public AdminTokenFilter(AdminAuth auth) { this.auth = auth; }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !path(request).startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String method = req.getMethod();
        if ("OPTIONS".equalsIgnoreCase(method)) { chain.doFilter(req, res); return; }

        if (!auth.isConfigured()) { chain.doFilter(req, res); return; }

        String path = path(req);

        if (auth.matches(auth.tokenFrom(req))) {
            req.setAttribute(AdminAuth.REQUEST_ATTR, Boolean.TRUE);
            chain.doFilter(req, res);
            return;
        }

        boolean read = "GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method);
        if (!read || PRIVATE_READ.matcher(path).matches()) { deny(res, 401, "admin token required"); return; }
        chain.doFilter(req, res);
    }

    private static String path(HttpServletRequest req) {
        String uri = req.getRequestURI();
        String ctx = req.getContextPath();
        return (ctx != null && !ctx.isEmpty() && uri.startsWith(ctx)) ? uri.substring(ctx.length()) : uri;
    }

    private static void deny(HttpServletResponse res, int status, String message) throws IOException {
        res.setStatus(status);
        res.setContentType("application/json");
        res.setCharacterEncoding("UTF-8");
        res.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
