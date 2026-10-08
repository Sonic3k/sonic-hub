package com.sonic.angels.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Deletes files from B2 — only once the database change that dropped them has committed. A delete that rolls back
 * then never costs a file; a B2 failure only leaves an orphan file behind (logged), never a row pointing at nothing.
 */
@Component
public class StoragePurger {

    private static final Logger log = LoggerFactory.getLogger(StoragePurger.class);
    private static final int THREADS = 8;

    private final StorageService storageService;

    public StoragePurger(StorageService storageService) { this.storageService = storageService; }

    public record Result(int deleted, int failed) {}

    /** Delete these keys now, a few at a time in parallel. */
    public Result purge(List<String> keys) {
        if (keys.isEmpty()) return new Result(0, 0);
        if (!storageService.isConfigured()) {
            log.warn("Storage not configured: {} B2 file(s) not deleted (orphan files left)", keys.size());
            return new Result(0, keys.size());
        }
        AtomicInteger ok = new AtomicInteger(), bad = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(Math.min(THREADS, keys.size()));
        try {
            List<Future<?>> jobs = new ArrayList<>(keys.size());
            for (String key : keys) {
                jobs.add(pool.submit(() -> {
                    try { storageService.delete(key); ok.incrementAndGet(); }
                    catch (Exception e) {
                        bad.incrementAndGet();
                        log.warn("B2 delete failed for {} (orphan file left): {}", key, e.getMessage());
                    }
                }));
            }
            for (Future<?> job : jobs) {
                try { job.get(); } catch (Exception e) { /* counted inside the job */ }
            }
        } finally {
            pool.shutdown();
        }
        log.info("B2 delete: {} deleted, {} failed", ok.get(), bad.get());
        return new Result(ok.get(), bad.get());
    }

    /** Delete these keys after the current transaction commits (right away when there is none); never on rollback. */
    public void purgeAfterCommit(List<String> keys) {
        if (keys.isEmpty()) return;
        List<String> copy = List.copyOf(keys);
        if (!TransactionSynchronizationManager.isSynchronizationActive()) { purge(copy); return; }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { purge(copy); }
        });
    }
}
