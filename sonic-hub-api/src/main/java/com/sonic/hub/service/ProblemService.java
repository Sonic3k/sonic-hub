package com.sonic.hub.service;

import com.sonic.hub.dto.ProblemDto;
import com.sonic.hub.dto.TagDto;
import com.sonic.hub.exception.ResourceNotFoundException;
import com.sonic.hub.model.Problem;
import com.sonic.hub.model.ProblemStatus;
import com.sonic.hub.model.Tag;
import com.sonic.hub.model.TrackingRule;
import com.sonic.hub.repository.ProblemRepository;
import com.sonic.hub.repository.TagRepository;
import com.sonic.hub.repository.TrackingRuleRepository;
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
public class ProblemService {

    private final ProblemRepository problemRepository;
    private final TagRepository tagRepository;
    private final TagService tagService;
    private final ProjectService projectService;
    private final TrackingRuleRepository trackingRuleRepository;

    public List<ProblemDto.Response> getAll(ProblemStatus status) {
        if (status != null) {
            return problemRepository.findByStatusOrderByCreatedAtDesc(status)
                    .stream().map(this::toResponse).collect(Collectors.toList());
        }
        return problemRepository.findAll().stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public List<ProblemDto.Response> getByProject(UUID projectId) {
        return problemRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<ProblemDto.Response> getStandalone() {
        return problemRepository.findByProjectIsNullOrderByCreatedAtDesc()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public ProblemDto.Response getById(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional
    public ProblemDto.Response create(ProblemDto.Request request) {
        Problem problem = Problem.builder()
                .title(request.getTitle().trim())
                .note(request.getNote())
                .status(request.getStatus() != null ? request.getStatus() : ProblemStatus.NEW)
                .createdBy(request.getCreatedBy())
                .build();
        if (request.getProjectId() != null) {
            problem.setProject(projectService.findById(request.getProjectId()));
        }
        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            problem.setTags(tagRepository.findAllByIdIn(request.getTagIds()));
        }
        Problem saved = problemRepository.save(problem);

        // Auto-create tracking rule if tracking fields present
        if (request.getReminderPattern() != null || request.getFrequencyType() != null) {
            TrackingRule rule = TrackingRule.builder()
                    .entityType("problem")
                    .entityId(saved.getId())
                    .frequencyType(request.getFrequencyType())
                    .currentLimit(request.getCurrentLimit())
                    .targetLimit(request.getTargetLimit())
                    .reminderPattern(request.getReminderPattern())
                    .reminderMessage(request.getReminderMessage() != null ? request.getReminderMessage() : request.getTitle())
                    .active(true)
                    .build();
            trackingRuleRepository.save(rule);
        }

        return toResponse(saved);
    }

    @Transactional
    public ProblemDto.Response update(UUID id, ProblemDto.Request request) {
        Problem problem = findById(id);
        problem.setTitle(request.getTitle().trim());
        problem.setNote(request.getNote());
        if (request.getStatus() != null) problem.setStatus(request.getStatus());
        if (request.getProjectId() != null) {
            problem.setProject(projectService.findById(request.getProjectId()));
        } else {
            problem.setProject(null);
        }
        if (request.getTagIds() != null) {
            problem.setTags(tagRepository.findAllByIdIn(request.getTagIds()));
        }
        return toResponse(problemRepository.save(problem));
    }

    @Transactional
    public ProblemDto.Response addTag(UUID problemId, UUID tagId) {
        Problem problem = findById(problemId);
        Tag tag = tagService.findById(tagId);
        problem.getTags().add(tag);
        return toResponse(problemRepository.save(problem));
    }

    @Transactional
    public ProblemDto.Response removeTag(UUID problemId, UUID tagId) {
        Problem problem = findById(problemId);
        problem.getTags().removeIf(t -> t.getId().equals(tagId));
        return toResponse(problemRepository.save(problem));
    }

    @Transactional
    public void delete(UUID id) {
        problemRepository.delete(findById(id));
    }

    private Problem findById(UUID id) {
        return problemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found: " + id));
    }

    private ProblemDto.Response toResponse(Problem p) {
        Set<TagDto.Response> tagResponses = p.getTags().stream()
                .map(tagService::toResponse).collect(Collectors.toSet());
        return ProblemDto.Response.builder()
                .id(p.getId())
                .title(p.getTitle())
                .note(p.getNote())
                .status(p.getStatus())
                .projectId(p.getProject() != null ? p.getProject().getId() : null)
                .projectName(p.getProject() != null ? p.getProject().getName() : null)
                .tags(tagResponses)
                .createdBy(p.getCreatedBy())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
