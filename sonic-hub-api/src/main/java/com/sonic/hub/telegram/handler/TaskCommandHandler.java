package com.sonic.hub.telegram.handler;

import com.sonic.hub.dto.TaskDto;
import com.sonic.hub.model.TaskStatus;
import com.sonic.hub.service.TaskService;
import com.sonic.hub.telegram.util.MessageFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.objects.Message;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class TaskCommandHandler implements CommandHandler {

    private final TaskService taskService;

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
        var request = new TaskDto.Request();
        request.setTitle(args.trim());
        request.setStatus(TaskStatus.OPEN);
        var created = taskService.create(request);
        return MessageFormatter.formatTaskCreated(created);
    }

    private String listTasks() {
        List<TaskDto.Response> tasks = taskService.getRootTasks(null);
        // Filter only active tasks (not done/closed)
        var active = tasks.stream()
                .filter(t -> t.getStatus() != TaskStatus.DONE && t.getStatus() != TaskStatus.CLOSED)
                .toList();
        return MessageFormatter.formatTaskList(active);
    }
}
