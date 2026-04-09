package com.sonic.angels.controller;

import com.sonic.angels.model.dto.CollectionDto;
import com.sonic.angels.model.entity.Collection;
import com.sonic.angels.service.CollectionService;
import com.sonic.angels.service.DtoMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/collections")
public class CollectionController {

    private final CollectionService collectionService;
    private final DtoMapper mapper;

    public CollectionController(CollectionService collectionService, DtoMapper mapper) {
        this.collectionService = collectionService; this.mapper = mapper;
    }

    @GetMapping
    public List<CollectionDto.Response> findAll() { return collectionService.findAll().stream().map(mapper::toCollectionResponse).toList(); }

    @GetMapping("/roots")
    public List<CollectionDto.Response> findRoots() { return collectionService.findRoots().stream().map(mapper::toCollectionResponse).toList(); }

    @GetMapping("/{id}")
    public CollectionDto.Response findById(@PathVariable Long id) { return mapper.toCollectionResponse(collectionService.findById(id)); }

    @PostMapping
    public CollectionDto.Response create(@RequestBody CollectionDto.Request req) {
        Collection c = new Collection();
        c.setName(req.getName()); c.setDescription(req.getDescription());
        if (req.getParentId() != null) c.setParent(collectionService.findById(req.getParentId()));
        return mapper.toCollectionResponse(collectionService.save(c));
    }

    @PutMapping("/{id}")
    public CollectionDto.Response update(@PathVariable Long id, @RequestBody CollectionDto.Request req) {
        Collection c = collectionService.findById(id);
        if (req.getName() != null) c.setName(req.getName());
        if (req.getDescription() != null) c.setDescription(req.getDescription());
        return mapper.toCollectionResponse(collectionService.save(c));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { collectionService.delete(id); return ResponseEntity.noContent().build(); }
}
