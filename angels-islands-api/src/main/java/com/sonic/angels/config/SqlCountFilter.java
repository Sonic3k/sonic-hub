package com.sonic.angels.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Opens and closes {@link SqlCounter} around every /api request, and writes a warning to the log when a read took
 * more statements than app.sql.warn-above (50 unless set): a list read is a handful of statements whatever its
 * length, so a count that grows with the rows means a relation is being fetched row by row.
 * Writes (imports, uploads) are counted too but not warned about: thousands of inserts are their work.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class SqlCountFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(SqlCountFilter.class);

    @Value("${app.sql.warn-above:50}")
    private int warnAbove;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri == null || !uri.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long t0 = System.nanoTime();
        SqlCounter.begin();
        try {
            chain.doFilter(request, response);
        } finally {
            int n = SqlCounter.end();
            if (n > warnAbove && "GET".equals(request.getMethod())) {
                String q = request.getQueryString();
                log.warn("{} SQL statements for GET {}{} ({} ms) — a relation is probably fetched row by row",
                    n, request.getRequestURI(), q == null ? "" : "?" + q, (System.nanoTime() - t0) / 1_000_000);
            }
        }
    }
}
