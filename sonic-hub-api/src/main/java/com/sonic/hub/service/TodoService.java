package com.sonic.hub.service;

import com.sonic.hub.dto.TagDto;
import com.sonic.hub.dto.TodoDto;
import com.sonic.hub.exception.ResourceNotFoundException;
import com.sonic.hub.model.Tag;
import com.sonic.hub.model.Todo;
import com.sonic.hub.repository.TagRepository;
import com.sonic.hub.repository.TodoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TodoService {

    private final TodoRepository todoRepository;
    private final TagRepository tagRepository;
    private final TagService tagService;
    private final ProjectService projectService;

    public List<TodoDto.Response> getAll() {
        return todoRepository.findAll().stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public List<TodoDto.Response> getByProject(UUID projectId) {
        return todoRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<TodoDto.Response> getStandalone() {
        return todoRepository.findByProjectIsNullOrderByCreatedAtDesc()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public TodoDto.Response getById(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional
    public TodoDto.Response create(TodoDto.Request request) {
        Todo todo = Todo.builder()
                .title(request.getTitle().trim())
                .done(false)
                .build();
        if (request.getProjectId() != null) {
            todo.setProject(projectService.findById(request.getProjectId()));
        }
        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            todo.setTags(tagRepository.findAllByIdIn(request.getTagIds()));
        }
        return toResponse(todoRepository.save(todo));
    }

    @Transactional
    public TodoDto.Response update(UUID id, TodoDto.Request request) {
        Todo todo = findById(id);
        todo.setTitle(request.getTitle().trim());
        if (request.getProjectId() != null) {
            todo.setProject(projectService.findById(request.getProjectId()));
        } else {
            todo.setProject(null);
        }
        if (request.getTagIds() != null) {
            todo.setTags(tagRepository.findAllByIdIn(request.getTagIds()));
        }
        return toResponse(todoRepository.save(todo));
    }

    @Transactional
    public TodoDto.Response toggleDone(UUID id) {
        Todo todo = findById(id);
        todo.setDone(!todo.isDone());
        return toResponse(todoRepository.save(todo));
    }

    @Transactional
    public TodoDto.Response addTag(UUID todoId, UUID tagId) {
        Todo todo = findById(todoId);
        Tag tag = tagService.findById(tagId);
        todo.getTags().add(tag);
        return toResponse(todoRepository.save(todo));
    }

    @Transactional
    public TodoDto.Response removeTag(UUID todoId, UUID tagId) {
        Todo todo = findById(todoId);
        todo.getTags().removeIf(t -> t.getId().equals(tagId));
        return toResponse(todoRepository.save(todo));
    }

    @Transactional
    public void delete(UUID id) {
        todoRepository.delete(findById(id));
    }

    private Todo findById(UUID id) {
        return todoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Todo not found: " + id));
    }

    private TodoDto.Response toResponse(Todo todo) {
        Set<TagDto.Response> tagResponses = todo.getTags().stream()
                .map(tagService::toResponse).collect(Collectors.toSet());
        return TodoDto.Response.builder()
                .id(todo.getId())
                .title(todo.getTitle())
                .done(todo.isDone())
                .projectId(todo.getProject() != null ? todo.getProject().getId() : null)
                .projectName(todo.getProject() != null ? todo.getProject().getName() : null)
                .tags(tagResponses)
                .createdAt(todo.getCreatedAt())
                .updatedAt(todo.getUpdatedAt())
                .build();
    }
}
