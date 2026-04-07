package com.sonic.hub.controller;

import com.sonic.hub.dto.TrackingRuleDto;
import com.sonic.hub.service.TrackingRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tracking-rules")
@RequiredArgsConstructor
public class TrackingRuleController {

    private final TrackingRuleService trackingRuleService;

    @GetMapping
    public List<TrackingRuleDto.Response> getByEntity(
            @RequestParam String entityType,
            @RequestParam UUID entityId) {
        return trackingRuleService.getByEntity(entityType, entityId);
    }

    @GetMapping("/active")
    public List<TrackingRuleDto.Response> getActive() {
        return trackingRuleService.getActive();
    }

    @GetMapping("/reminders")
    public List<TrackingRuleDto.Response> getActiveWithReminders() {
        return trackingRuleService.getActiveWithReminders();
    }

    @GetMapping("/{id}")
    public TrackingRuleDto.Response getById(@PathVariable UUID id) {
        return trackingRuleService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TrackingRuleDto.Response create(@Valid @RequestBody TrackingRuleDto.Request request) {
        return trackingRuleService.create(request);
    }

    @PutMapping("/{id}")
    public TrackingRuleDto.Response update(@PathVariable UUID id, @Valid @RequestBody TrackingRuleDto.Request request) {
        return trackingRuleService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        trackingRuleService.delete(id);
    }
}
