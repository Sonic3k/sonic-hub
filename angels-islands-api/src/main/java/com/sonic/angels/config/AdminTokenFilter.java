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
 * (chat archives, other chats, memory, rankings, contacts, companion, journal problems, imports, finance,
 * and the Mystic briefs — readings made from the family's birth data).
 * Photos, collections, tags and persons stay public for sonic-hub-web (a person's birth time and place are left out
 * for the public, PersonController); journal notes answer only with published articles to callers without the
 * token (JournalController). Mystic's pushes of a brief carry their own token (MYSTIC_SYNC_TOKEN), checked by
 * MysticBriefController.
 */
public class AdminTokenFilter extends OncePerRequestFilter {

    private static final Pattern PRIVATE_READ = Pattern.compile(
        "^/api/(persons/[^/]+/(chat-archives|memory|contacts|companion|rankings|mystic-briefs)(/.*)?" +
        "|companion(/.*)?|chat-archives(/.*)?|chat-attachments(/.*)?|journal/(problems|authors)(/.*)?|import(/.*)?|rankings(/.*)?" +
        "|finance(/.*)?)$");

    /** a brief Mystic sends or withdraws (PUT / DELETE) */
    private static final Pattern MYSTIC_PUSH = Pattern.compile("^/api/persons/[^/]+/mystic-briefs/[^/]+$");

    private final AdminAuth auth;

    public AdminTokenFilter(AdminAuth auth) { this.auth = auth; }

    /** The SePay webhook carries its own key (SEPAY_API_KEY), checked by FinanceHookController; Mystic's pushes carry
     *  MYSTIC_SYNC_TOKEN, checked by MysticBriefController. */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String p = path(request);
        if (!p.startsWith("/api/") || p.startsWith("/api/finance/hooks/")) return true;
        String m = request.getMethod();
        return ("PUT".equalsIgnoreCase(m) || "DELETE".equalsIgnoreCase(m)) && MYSTIC_PUSH.matcher(p).matches();
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
