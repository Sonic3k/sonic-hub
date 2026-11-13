package com.sonic.angels.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Which admin a browser's request comes from: the admin sends its number in the X-Admin-Client header.
 *
 * Lists send only what a caller asks for (the incl* parameters), and some of the admin's forms write back everything
 * they hold. A page of the admin that was loaded before a list changed would open such a form on a list's copy that
 * no longer has those parts, and saving it would wipe them. So a save that carries those parts must come from an
 * admin that knows: an older page is refused (409) and has to be reloaded.
 *
 *   2 — the memory editor reads the whole memory before it opens
 *   3 — the journal lists ask for the text, tags and problems that the journal's editor writes back
 */
public final class AdminClient {

    public static final String HEADER = "X-Admin-Client";

    private AdminClient() {}

    /** Refuses a browser whose admin is older than since. Requests that do not come from a browser (no Origin: the
     *  import scripts) are not asked. what = the parts the save carries, for the message. */
    public static void require(HttpServletRequest http, int since, String what) {
        if (http.getHeader("Origin") == null) return;
        int client = 0;
        try { client = Integer.parseInt(http.getHeader(HEADER)); } catch (NumberFormatException ignored) {}   // no header: an old page
        if (client < since) throw new ResponseStatusException(HttpStatus.CONFLICT,
            "This admin page is older than the API: reload it before changing " + what + ".");
    }
}
