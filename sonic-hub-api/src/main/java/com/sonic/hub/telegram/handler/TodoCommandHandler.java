package com.sonic.hub.telegram.handler;

import com.sonic.hub.dto.TodoDto;
import com.sonic.hub.service.TodoService;
import com.sonic.hub.telegram.util.MessageFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.objects.Message;

import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class TodoCommandHandler implements CommandHandler {

    private final TodoService todoService;

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
        var request = new TodoDto.Request();
        request.setTitle(args.trim());
        var created = todoService.create(request);
        return MessageFormatter.formatTodoCreated(created);
    }

    private String listTodos() {
        var todos = todoService.getAll().stream()
                .filter(t -> !t.isDone())
                .toList();
        return MessageFormatter.formatTodoList(todos);
    }
}
