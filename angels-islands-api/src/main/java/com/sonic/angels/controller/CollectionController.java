package com.sonic.angels.controller;

import com.sonic.angels.model.entity.Collection;
import com.sonic.angels.service.CollectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/collections")
public class CollectionController {

    private final CollectionService collectionService;

    public CollectionController(CollectionService collectionService) {
        this.collectionService = collectionService;
    }

    @GetMapping
    public List<Collection> findAll() { return collectionService.findAll(); }

    @GetMapping("/roots")
    public List<Collection> findRoots() { return collectionService.findRoots(); }

    @GetMapping("/{id}")
    public Collection findById(@PathVariable Long id) { return collectionService.findById(id); }

    @PostMapping
    public Collection create(@RequestBody Collection collection) { return collectionService.save(collection); }

    @PutMapping("/{id}")
    public Collection update(@PathVariable Long id, @RequestBody Collection collection) {
        Collection existing = collectionService.findById(id);
        if (collection.getName() != null) existing.setName(collection.getName());
        if (collection.getDescription() != null) existing.setDescription(collection.getDescription());
        return collectionService.save(existing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        collectionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
