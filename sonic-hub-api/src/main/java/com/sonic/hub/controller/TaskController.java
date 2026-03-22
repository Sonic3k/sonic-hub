package com.sonic.hub.controller;

import com.sonic.hub.dto.TaskDto;
import com.sonic.hub.model.TaskStatus;
import com.sonic.hub.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    public List<TaskDto.Response> getRootTasks(
            @RequestParam(required = false) TaskStatus status) {
        return taskService.getRootTasks(status);
    }

    @GetMapping("/{id}")
    public TaskDto.Response getById(@PathVariable UUID id) {
        return taskService.getById(id);
    }

    @GetMapping("/{id}/children")
    public List<TaskDto.Response> getChildren(@PathVariable UUID id) {
        return taskService.getChildren(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskDto.Response create(@Valid @RequestBody TaskDto.Request request) {
        return taskService.create(request);
    }

    @PutMapping("/{id}")
    public TaskDto.Response update(@PathVariable UUID id,
            @Valid @RequestBody TaskDto.Request request) {
        return taskService.update(id, request);
    }

    // Move task to different parent and/or project
    @PostMapping("/{id}/move")
    public TaskDto.Response move(@PathVariable UUID id,
            @RequestBody TaskDto.MoveRequest request) {
        return taskService.move(id, request);
    }

    @PostMapping("/{id}/tags/{tagId}")
    public TaskDto.Response addTag(@PathVariable UUID id, @PathVariable UUID tagId) {
        return taskService.addTag(id, tagId);
    }

    @DeleteMapping("/{id}/tags/{tagId}")
    public TaskDto.Response removeTag(@PathVariable UUID id, @PathVariable UUID tagId) {
        return taskService.removeTag(id, tagId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        taskService.delete(id);
    }
}
