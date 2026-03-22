package com.sonic.hub.controller;

import com.sonic.hub.dto.ProblemDto;
import com.sonic.hub.dto.ProjectDto;
import com.sonic.hub.dto.TaskDto;
import com.sonic.hub.dto.TodoDto;
import com.sonic.hub.service.ProblemService;
import com.sonic.hub.service.ProjectService;
import com.sonic.hub.service.TaskService;
import com.sonic.hub.service.TodoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final TaskService taskService;
    private final TodoService todoService;
    private final ProblemService problemService;

    @GetMapping
    public List<ProjectDto.Response> getAll() {
        return projectService.getAll();
    }

    @GetMapping("/{id}")
    public ProjectDto.Response getById(@PathVariable UUID id) {
        return projectService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectDto.Response create(@Valid @RequestBody ProjectDto.Request request) {
        return projectService.create(request);
    }

    @PutMapping("/{id}")
    public ProjectDto.Response update(@PathVariable UUID id, @Valid @RequestBody ProjectDto.Request request) {
        return projectService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        projectService.delete(id);
    }

    // --- Sub-resources ---

    @GetMapping("/{id}/tasks")
    public List<TaskDto.Response> getTasks(@PathVariable UUID id) {
        return taskService.getByProject(id);
    }

    @GetMapping("/{id}/todos")
    public List<TodoDto.Response> getTodos(@PathVariable UUID id) {
        return todoService.getByProject(id);
    }

    @GetMapping("/{id}/problems")
    public List<ProblemDto.Response> getProblems(@PathVariable UUID id) {
        return problemService.getByProject(id);
    }
}
