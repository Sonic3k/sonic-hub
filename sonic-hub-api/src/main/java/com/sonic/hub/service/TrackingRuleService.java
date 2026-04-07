package com.sonic.hub.service;

import com.sonic.hub.dto.TrackingRuleDto;
import com.sonic.hub.exception.ResourceNotFoundException;
import com.sonic.hub.model.TrackingRule;
import com.sonic.hub.repository.TrackingRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TrackingRuleService {

    private final TrackingRuleRepository trackingRuleRepository;
    private final ProjectService projectService;

    public List<TrackingRuleDto.Response> getByEntity(String entityType, UUID entityId) {
        return trackingRuleRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<TrackingRuleDto.Response> getActive() {
        return trackingRuleRepository.findByActiveOrderByCreatedAtDesc(true)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<TrackingRuleDto.Response> getActiveWithReminders() {
        return trackingRuleRepository.findByReminderPatternNotNullAndActiveOrderByCreatedAtDesc(true)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public TrackingRuleDto.Response getById(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional
    public TrackingRuleDto.Response create(TrackingRuleDto.Request request) {
        TrackingRule rule = TrackingRule.builder()
                .entityType(request.getEntityType())
                .entityId(request.getEntityId())
                .frequencyType(request.getFrequencyType())
                .currentLimit(request.getCurrentLimit())
                .targetLimit(request.getTargetLimit())
                .reminderPattern(request.getReminderPattern())
                .reminderMessage(request.getReminderMessage())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();
        if (request.getProjectId() != null) {
            rule.setProject(projectService.findById(request.getProjectId()));
        }
        return toResponse(trackingRuleRepository.save(rule));
    }

    @Transactional
    public TrackingRuleDto.Response update(UUID id, TrackingRuleDto.Request request) {
        TrackingRule rule = findById(id);
        if (request.getFrequencyType() != null) rule.setFrequencyType(request.getFrequencyType());
        if (request.getCurrentLimit() != null) rule.setCurrentLimit(request.getCurrentLimit());
        if (request.getTargetLimit() != null) rule.setTargetLimit(request.getTargetLimit());
        if (request.getReminderPattern() != null) rule.setReminderPattern(request.getReminderPattern());
        if (request.getReminderMessage() != null) rule.setReminderMessage(request.getReminderMessage());
        if (request.getActive() != null) rule.setActive(request.getActive());
        if (request.getProjectId() != null) {
            rule.setProject(projectService.findById(request.getProjectId()));
        }
        return toResponse(trackingRuleRepository.save(rule));
    }

    @Transactional
    public void delete(UUID id) {
        trackingRuleRepository.delete(findById(id));
    }

    private TrackingRule findById(UUID id) {
        return trackingRuleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TrackingRule not found: " + id));
    }

    private TrackingRuleDto.Response toResponse(TrackingRule r) {
        return TrackingRuleDto.Response.builder()
                .id(r.getId())
                .entityType(r.getEntityType())
                .entityId(r.getEntityId())
                .frequencyType(r.getFrequencyType())
                .currentLimit(r.getCurrentLimit())
                .targetLimit(r.getTargetLimit())
                .reminderPattern(r.getReminderPattern())
                .reminderMessage(r.getReminderMessage())
                .active(r.isActive())
                .projectId(r.getProject() != null ? r.getProject().getId() : null)
                .projectName(r.getProject() != null ? r.getProject().getName() : null)
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
