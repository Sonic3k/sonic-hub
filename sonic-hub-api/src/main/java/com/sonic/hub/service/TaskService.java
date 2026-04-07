package com.sonic.hub.service;

import com.sonic.hub.dto.TagDto;
import com.sonic.hub.dto.TaskDto;
import com.sonic.hub.exception.BadRequestException;
import com.sonic.hub.exception.ResourceNotFoundException;
import com.sonic.hub.model.*;
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
    private final ProjectService projectService;

    public List<TaskDto.Response> getRootTasks(TaskStatus status) {
        List<Task> tasks = (status != null)
                ? taskRepository.findByParentIsNullAndStatusOrderByCreatedAtDesc(status)
                : taskRepository.findByParentIsNullOrderByCreatedAtDesc();
        return tasks.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<TaskDto.Response> getByProject(UUID projectId) {
        return taskRepository.findByProjectIdAndParentIsNullOrderByCreatedAtDesc(projectId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public TaskDto.Response getById(UUID id) {
        return toResponse(findById(id));
    }

    public List<TaskDto.Response> getChildren(UUID parentId) {
        findById(parentId);
        return taskRepository.findByParentIdOrderByCreatedAtDesc(parentId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public TaskDto.Response create(TaskDto.Request request) {
        Task task = Task.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : TaskStatus.OPEN)
                .priority(request.getPriority() != null ? request.getPriority() : Priority.MEDIUM)
                .dueDate(request.getDueDate())
                .dueDateTime(request.getDueDateTime())
                .duePeriod(request.getDuePeriod())
                .someday(request.getSomeday() != null ? request.getSomeday() : false)
                .recurringConfig(request.getRecurringConfig())
                .createdBy(request.getCreatedBy())
                .build();

        if (request.getParentId() != null) {
            task.setParent(findById(request.getParentId()));
        }
        if (request.getProjectId() != null) {
            task.setProject(projectService.findById(request.getProjectId()));
        }
        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            task.setTags(tagRepository.findAllByIdIn(request.getTagIds()));
        }
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskDto.Response update(UUID id, TaskDto.Request request) {
        Task task = findById(id);
        task.setTitle(request.getTitle().trim());
        task.setDescription(request.getDescription());
        task.setDueDate(request.getDueDate());
        task.setDueDateTime(request.getDueDateTime());
        task.setDuePeriod(request.getDuePeriod());
        if (request.getSomeday() != null) task.setSomeday(request.getSomeday());
        if (request.getStatus() != null) task.setStatus(request.getStatus());
        if (request.getPriority() != null) task.setPriority(request.getPriority());
        if (request.getRecurringConfig() != null) task.setRecurringConfig(request.getRecurringConfig());

        if (request.getProjectId() != null) {
            task.setProject(projectService.findById(request.getProjectId()));
        } else {
            task.setProject(null);
        }
        if (request.getTagIds() != null) {
            task.setTags(tagRepository.findAllByIdIn(request.getTagIds()));
        }
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskDto.Response move(UUID id, TaskDto.MoveRequest request) {
        Task task = findById(id);

        // Move parent
        if (request.getParentId() == null) {
            task.setParent(null);
        } else {
            if (request.getParentId().equals(id))
                throw new BadRequestException("Task cannot be its own parent");
            if (taskRepository.wouldCreateCycle(id, request.getParentId()))
                throw new BadRequestException("Move would create a circular reference");
            task.setParent(findById(request.getParentId()));
        }

        // Move project
        if (request.getProjectId() != null) {
            task.setProject(projectService.findById(request.getProjectId()));
        } else {
            task.setProject(null);
        }

        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskDto.Response addTag(UUID taskId, UUID tagId) {
        Task task = findById(taskId);
        task.getTags().add(tagService.findById(tagId));
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
        taskRepository.delete(findById(id));
    }

    public Task findById(UUID id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + id));
    }

    public TaskDto.Response toResponse(Task task) {
        Set<TagDto.Response> tagResponses = task.getTags().stream()
                .map(tagService::toResponse).collect(Collectors.toSet());
        return TaskDto.Response.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .dueDate(task.getDueDate())
                .dueDateTime(task.getDueDateTime())
                .duePeriod(task.getDuePeriod())
                .someday(task.isSomeday())
                .parentId(task.getParent() != null ? task.getParent().getId() : null)
                .childCount(taskRepository.countByParentId(task.getId()))
                .projectId(task.getProject() != null ? task.getProject().getId() : null)
                .projectName(task.getProject() != null ? task.getProject().getName() : null)
                .tags(tagResponses)
                .recurringConfig(task.getRecurringConfig())
                .createdBy(task.getCreatedBy())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}
