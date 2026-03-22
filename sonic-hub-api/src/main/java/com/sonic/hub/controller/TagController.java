package com.sonic.hub.controller;

import com.sonic.hub.dto.TagDto;
import com.sonic.hub.service.TagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public List<TagDto.Response> getAll() {
        return tagService.getAll();
    }

    @GetMapping("/{id}")
    public TagDto.Response getById(@PathVariable UUID id) {
        return tagService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TagDto.Response create(@Valid @RequestBody TagDto.Request request) {
        return tagService.create(request);
    }

    @PutMapping("/{id}")
    public TagDto.Response update(@PathVariable UUID id, @Valid @RequestBody TagDto.Request request) {
        return tagService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        tagService.delete(id);
    }
}
