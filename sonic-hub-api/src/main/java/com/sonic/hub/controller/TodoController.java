package com.sonic.hub.controller;

import com.sonic.hub.dto.TodoDto;
import com.sonic.hub.service.TodoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/todos")
@RequiredArgsConstructor
public class TodoController {

    private final TodoService todoService;

    @GetMapping
    public List<TodoDto.Response> getAll(
            @RequestParam(required = false) Boolean standalone) {
        if (Boolean.TRUE.equals(standalone)) return todoService.getStandalone();
        return todoService.getAll();
    }

    @GetMapping("/{id}")
    public TodoDto.Response getById(@PathVariable UUID id) {
        return todoService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TodoDto.Response create(@Valid @RequestBody TodoDto.Request request) {
        return todoService.create(request);
    }

    @PutMapping("/{id}")
    public TodoDto.Response update(@PathVariable UUID id, @Valid @RequestBody TodoDto.Request request) {
        return todoService.update(id, request);
    }

    @PatchMapping("/{id}/done")
    public TodoDto.Response toggleDone(@PathVariable UUID id) {
        return todoService.toggleDone(id);
    }

    @PostMapping("/{id}/tags/{tagId}")
    public TodoDto.Response addTag(@PathVariable UUID id, @PathVariable UUID tagId) {
        return todoService.addTag(id, tagId);
    }

    @DeleteMapping("/{id}/tags/{tagId}")
    public TodoDto.Response removeTag(@PathVariable UUID id, @PathVariable UUID tagId) {
        return todoService.removeTag(id, tagId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        todoService.delete(id);
    }
}
