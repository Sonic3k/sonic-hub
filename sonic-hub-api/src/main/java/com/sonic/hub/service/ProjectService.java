package com.sonic.hub.service;

import com.sonic.hub.dto.ProjectDto;
import com.sonic.hub.exception.ConflictException;
import com.sonic.hub.exception.ResourceNotFoundException;
import com.sonic.hub.model.Project;
import com.sonic.hub.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {

    private final ProjectRepository projectRepository;

    public List<ProjectDto.Response> getAll() {
        return projectRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ProjectDto.Response getById(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional
    public ProjectDto.Response create(ProjectDto.Request request) {
        if (projectRepository.existsByName(request.getName())) {
            throw new ConflictException("Project name already exists: " + request.getName());
        }
        Project project = Project.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .color(request.getColor())
                .build();
        return toResponse(projectRepository.save(project));
    }

    @Transactional
    public ProjectDto.Response update(UUID id, ProjectDto.Request request) {
        Project project = findById(id);
        if (!project.getName().equals(request.getName()) &&
                projectRepository.existsByName(request.getName())) {
            throw new ConflictException("Project name already exists: " + request.getName());
        }
        project.setName(request.getName().trim());
        project.setDescription(request.getDescription());
        project.setColor(request.getColor());
        return toResponse(projectRepository.save(project));
    }

    @Transactional
    public void delete(UUID id) {
        projectRepository.delete(findById(id));
    }

    public Project findById(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + id));
    }

    public ProjectDto.Response toResponse(Project p) {
        return ProjectDto.Response.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .color(p.getColor())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
