package com.sonic.hub.service;

import com.sonic.hub.dto.TagDto;
import com.sonic.hub.dto.TaskDto;
import com.sonic.hub.exception.BadRequestException;
import com.sonic.hub.exception.ResourceNotFoundException;
import com.sonic.hub.model.Tag;
import com.sonic.hub.model.Task;
import com.sonic.hub.model.TaskStatus;
import com.sonic.hub.repository.TagRepository;
import com.sonic.hub.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TaskService {

    private final TaskRepository taskRepository;
    private final TagRepository tagRepository;
    private final TagService tagService;

    // --- Queries ---

    public List<TaskDto.Response> getRootTasks(TaskStatus status) {
        List<Task> tasks = (status != null)
                ? taskRepository.findByParentIsNullAndStatusOrderByCreatedAtDesc(status)
                : taskRepository.findByParentIsNullOrderByCreatedAtDesc();
        return tasks.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public TaskDto.Response getById(UUID id) {
        return toResponse(findById(id));
    }

    public List<TaskDto.Response> getChildren(UUID parentId) {
        findById(parentId); // validate parent exists
        return taskRepository.findByParentIdOrderByCreatedAtDesc(parentId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // --- Mutations ---

    @Transactional
    public TaskDto.Response create(TaskDto.Request request) {
        Task task = Task.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : TaskStatus.OPEN)
                .build();

        if (request.getParentId() != null) {
            Task parent = findById(request.getParentId());
            task.setParent(parent);
        }

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            Set<Tag> tags = tagRepository.findAllByIdIn(request.getTagIds());
            task.setTags(tags);
        }

        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskDto.Response update(UUID id, TaskDto.Request request) {
        Task task = findById(id);

        task.setTitle(request.getTitle().trim());
        task.setDescription(request.getDescription());

        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }

        if (request.getTagIds() != null) {
            Set<Tag> tags = tagRepository.findAllByIdIn(request.getTagIds());
            task.setTags(tags);
        }

        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskDto.Response move(UUID id, TaskDto.MoveRequest request) {
        Task task = findById(id);

        if (request.getParentId() == null) {
            // Move to root
            task.setParent(null);
        } else {
            if (request.getParentId().equals(id)) {
                throw new BadRequestException("Task cannot be its own parent");
            }
            if (taskRepository.wouldCreateCycle(id, request.getParentId())) {
                throw new BadRequestException("Move would create a circular reference");
            }
            Task newParent = findById(request.getParentId());
            task.setParent(newParent);
        }

        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskDto.Response addTag(UUID taskId, UUID tagId) {
        Task task = findById(taskId);
        Tag tag = tagService.findById(tagId);
        task.getTags().add(tag);
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskDto.Response removeTag(UUID taskId, UUID tagId) {
        Task task = findById(taskId);
        task.getTags().removeIf(t -> t.getId().equals(tagId));
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public void delete(UUID id) {
        Task task = findById(id);
        taskRepository.delete(task);
    }

    // --- Helpers ---

    private Task findById(UUID id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + id));
    }

    private TaskDto.Response toResponse(Task task) {
        Set<TagDto.Response> tagResponses = task.getTags().stream()
                .map(tagService::toResponse)
                .collect(Collectors.toSet());

        return TaskDto.Response.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .parentId(task.getParent() != null ? task.getParent().getId() : null)
                .childCount(taskRepository.countByParentId(task.getId()))
                .tags(tagResponses)
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}
