package com.sonic.connector.telegram.handler;

import com.sonic.connector.core.ApiModels.ProblemRequest;
import com.sonic.connector.core.SonicHubApiClient;
import com.sonic.connector.telegram.util.MessageFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.objects.message.Message;

import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProblemCommandHandler implements CommandHandler {

    private final SonicHubApiClient apiClient;

    @Override
    public boolean supports(String command) {
        return Set.of("/p", "/problems").contains(command);
    }

    @Override
    public String handle(Message message, String command, String args) {
        return switch (command) {
            case "/p" -> createProblem(args);
            case "/problems" -> listProblems();
            default -> null;
        };
    }

    private String createProblem(String args) {
        if (args == null || args.isBlank()) {
            return "❌ Usage: `/p Problem description here`";
        }
        var request = ProblemRequest.builder()
                .title(args.trim())
                .status("NEW")
                .build();
        var created = apiClient.createProblem(request);
        return MessageFormatter.formatProblemCreated(created);
    }

    private String listProblems() {
        var problems = apiClient.getProblems().stream()
                .filter(p -> !"RESOLVED".equals(p.getStatus()) && !"DISMISSED".equals(p.getStatus()))
                .toList();
        return MessageFormatter.formatProblemList(problems);
    }
}
