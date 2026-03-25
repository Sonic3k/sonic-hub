package com.sonic.connector.telegram.handler;

import com.sonic.connector.core.ApiModels.TaskRequest;
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
public class TaskCommandHandler implements CommandHandler {

    private final SonicHubApiClient apiClient;

    @Override
    public boolean supports(String command) {
        return Set.of("/t", "/tasks").contains(command);
    }

    @Override
    public String handle(Message message, String command, String args) {
        return switch (command) {
            case "/t" -> createTask(args);
            case "/tasks" -> listTasks();
            default -> null;
        };
    }

    private String createTask(String args) {
        if (args == null || args.isBlank()) {
            return "❌ Usage: `/t Task title here`";
        }
        var request = TaskRequest.builder()
                .title(args.trim())
                .status("OPEN")
                .build();
        var created = apiClient.createTask(request);
        return MessageFormatter.formatTaskCreated(created);
    }

    private String listTasks() {
        var tasks = apiClient.getTasks().stream()
                .filter(t -> !"DONE".equals(t.getStatus()) && !"CLOSED".equals(t.getStatus()))
                .toList();
        return MessageFormatter.formatTaskList(tasks);
    }
}
