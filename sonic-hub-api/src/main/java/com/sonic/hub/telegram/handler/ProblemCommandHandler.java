package com.sonic.hub.telegram.handler;

import com.sonic.hub.dto.ProblemDto;
import com.sonic.hub.model.ProblemStatus;
import com.sonic.hub.service.ProblemService;
import com.sonic.hub.telegram.util.MessageFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.objects.Message;

import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProblemCommandHandler implements CommandHandler {

    private final ProblemService problemService;

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
        var request = new ProblemDto.Request();
        request.setTitle(args.trim());
        request.setStatus(ProblemStatus.NEW);
        var created = problemService.create(request);
        return MessageFormatter.formatProblemCreated(created);
    }

    private String listProblems() {
        var problems = problemService.getAll(null).stream()
                .filter(p -> p.getStatus() != ProblemStatus.RESOLVED && p.getStatus() != ProblemStatus.DISMISSED)
                .toList();
        return MessageFormatter.formatProblemList(problems);
    }
}
