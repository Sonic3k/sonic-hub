package com.sonic.angels.controller;

import com.sonic.angels.service.ChatStatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/** Message numbers counted from the chats as they are now: one person (every nick and account together), or every Angel. */
@RestController
public class ChatStatsController {

    private final ChatStatsService stats;

    public ChatStatsController(ChatStatsService stats) { this.stats = stats; }

    @GetMapping("/api/persons/{personId}/chat-stats")
    public Map<String, Object> person(@PathVariable UUID personId) { return stats.person(personId); }

    @GetMapping("/api/chat-stats")
    public Map<String, Object> board() { return stats.board(); }
}
