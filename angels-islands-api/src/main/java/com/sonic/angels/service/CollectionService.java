package com.sonic.angels.service;

import com.sonic.angels.model.entity.Collection;
import com.sonic.angels.repository.CollectionRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class CollectionService {

    private final CollectionRepository collectionRepository;

    public CollectionService(CollectionRepository collectionRepository) {
        this.collectionRepository = collectionRepository;
    }

    public List<Collection> findAll() { return collectionRepository.findAll(); }
    public List<Collection> findRoots() { return collectionRepository.findByParentIsNull(); }
    public Collection findById(Long id) { return collectionRepository.findById(id).orElseThrow(() -> new RuntimeException("Collection not found: " + id)); }
    public Collection save(Collection collection) { return collectionRepository.save(collection); }
    public void delete(Long id) { collectionRepository.deleteById(id); }
}
