package com.sonic.hub.controller;

import com.sonic.hub.dto.ProblemDto;
import com.sonic.hub.model.ProblemStatus;
import com.sonic.hub.service.ProblemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/problems")
@RequiredArgsConstructor
public class ProblemController {

    private final ProblemService problemService;

    @GetMapping
    public List<ProblemDto.Response> getAll(
            @RequestParam(required = false) ProblemStatus status,
            @RequestParam(required = false) Boolean standalone) {
        if (Boolean.TRUE.equals(standalone)) return problemService.getStandalone();
        return problemService.getAll(status);
    }

    @GetMapping("/{id}")
    public ProblemDto.Response getById(@PathVariable UUID id) {
        return problemService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProblemDto.Response create(@Valid @RequestBody ProblemDto.Request request) {
        return problemService.create(request);
    }

    @PutMapping("/{id}")
    public ProblemDto.Response update(@PathVariable UUID id, @Valid @RequestBody ProblemDto.Request request) {
        return problemService.update(id, request);
    }

    @PostMapping("/{id}/tags/{tagId}")
    public ProblemDto.Response addTag(@PathVariable UUID id, @PathVariable UUID tagId) {
        return problemService.addTag(id, tagId);
    }

    @DeleteMapping("/{id}/tags/{tagId}")
    public ProblemDto.Response removeTag(@PathVariable UUID id, @PathVariable UUID tagId) {
        return problemService.removeTag(id, tagId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        problemService.delete(id);
    }
}
