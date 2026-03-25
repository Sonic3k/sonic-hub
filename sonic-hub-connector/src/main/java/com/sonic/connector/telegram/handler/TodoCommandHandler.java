package com.sonic.connector.telegram.handler;

import com.sonic.connector.core.ApiModels.TodoRequest;
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
public class TodoCommandHandler implements CommandHandler {

    private final SonicHubApiClient apiClient;

    @Override
    public boolean supports(String command) {
        return Set.of("/td", "/todos").contains(command);
    }

    @Override
    public String handle(Message message, String command, String args) {
        return switch (command) {
            case "/td" -> createTodo(args);
            case "/todos" -> listTodos();
            default -> null;
        };
    }

    private String createTodo(String args) {
        if (args == null || args.isBlank()) {
            return "❌ Usage: `/td Todo title here`";
        }
        var request = TodoRequest.builder().title(args.trim()).build();
        var created = apiClient.createTodo(request);
        return MessageFormatter.formatTodoCreated(created);
    }

    private String listTodos() {
        var todos = apiClient.getTodos().stream()
                .filter(t -> !t.isDone())
                .toList();
        return MessageFormatter.formatTodoList(todos);
    }
}
