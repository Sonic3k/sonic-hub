package com.sonic.angels.controller;

import com.sonic.angels.model.dto.TagDto;
import com.sonic.angels.model.entity.Tag;
import com.sonic.angels.service.DtoMapper;
import com.sonic.angels.service.TagService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tags")
public class TagController {

    private final TagService tagService;
    private final DtoMapper mapper;

    public TagController(TagService tagService, DtoMapper mapper) { this.tagService = tagService; this.mapper = mapper; }

    @GetMapping
    public List<TagDto.Response> findAll() { return tagService.findAll().stream().map(mapper::toTagResponse).toList(); }

    @PostMapping
    public TagDto.Response create(@RequestBody TagDto.Request req) {
        Tag t = new Tag(); t.setName(req.getName()); t.setColor(req.getColor()); t.setDescription(req.getDescription());
        return mapper.toTagResponse(tagService.save(t));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { tagService.delete(id); return ResponseEntity.noContent().build(); }
}
