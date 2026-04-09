package com.sonic.angels.config;

import com.sonic.angels.model.entity.Collection;
import com.sonic.angels.repository.CollectionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class RootCollectionInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(RootCollectionInitializer.class);
    public static final String ROOT_NAME = "Angels Islands";

    private final CollectionRepository collectionRepository;

    public RootCollectionInitializer(CollectionRepository collectionRepository) {
        this.collectionRepository = collectionRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        collectionRepository.findByNameAndParentIsNull(ROOT_NAME).orElseGet(() -> {
            Collection root = new Collection();
            root.setName(ROOT_NAME);
            Collection saved = collectionRepository.save(root);
            log.info("Created root collection '{}' (id: {})", ROOT_NAME, saved.getId());
            return saved;
        });
    }
}
