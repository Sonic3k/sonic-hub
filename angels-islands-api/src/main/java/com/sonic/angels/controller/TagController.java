package com.sonic.angels.controller;

import com.sonic.angels.model.entity.Tag;
import com.sonic.angels.service.TagService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tags")
public class TagController {

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    @GetMapping
    public List<Tag> findAll() { return tagService.findAll(); }

    @PostMapping
    public Tag create(@RequestBody Tag tag) { return tagService.save(tag); }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        tagService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
