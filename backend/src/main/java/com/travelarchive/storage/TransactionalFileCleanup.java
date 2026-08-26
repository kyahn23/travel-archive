package com.travelarchive.storage;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Registers file-deletion callbacks that fire only after the surrounding
 * transaction commits successfully. Storage I/O exceptions during afterCommit
 * are caught and logged; they never surface to the originating request.
 *
 * ponytail: best-effort cleanup ceiling — orphan files may persist when the
 * underlying filesystem rejects unlink. Upgrade path is a durable outbox or
 * a periodic reconciler scanning the storage root against TripPhoto rows.
 */
@Component
public class TransactionalFileCleanup {

    private static final Logger log = LoggerFactory.getLogger(TransactionalFileCleanup.class);

    private final StorageService storageService;

    public TransactionalFileCleanup(StorageService storageService) {
        this.storageService = storageService;
    }

    public void registerAfterCommit(String storageKey) {
        requireActive();
        TransactionSynchronizationManager.registerSynchronization(
                new AfterCommit(() -> deleteQuietly(storageKey, "afterCommit")));
    }

    public void registerAfterCommit(List<String> storageKeys) {
        if (storageKeys == null || storageKeys.isEmpty()) return;
        requireActive();
        List<String> snapshot = List.copyOf(storageKeys);
        TransactionSynchronizationManager.registerSynchronization(
                new AfterCommit(() -> {
                    for (String key : snapshot) {
                        deleteQuietly(key, "afterCommit");
                    }
                }));
    }

    public void registerRollbackDelete(String storageKey) {
        requireActive();
        TransactionSynchronizationManager.registerSynchronization(
                new AfterCompletion((status) -> {
                    if (status == TransactionSynchronization.STATUS_COMMITTED) return;
                    deleteQuietly(storageKey, "rollback");
                }));
    }

    private void requireActive() {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException(
                    "TransactionalFileCleanup requires an active Spring-managed transaction");
        }
    }

    private void deleteQuietly(String storageKey, String phase) {
        if (storageKey == null || storageKey.isBlank()) return;
        try {
            storageService.delete(storageKey);
        } catch (RuntimeException ex) {
            log.warn("file cleanup failed phase={} key={} cause={}", phase, storageKey, ex.toString());
        }
    }

    private static final class AfterCommit implements TransactionSynchronization {
        private final Runnable runnable;
        AfterCommit(Runnable runnable) { this.runnable = runnable; }
        @Override public void afterCommit() { runnable.run(); }
    }

    private static final class AfterCompletion implements TransactionSynchronization {
        private final java.util.function.IntConsumer consumer;
        AfterCompletion(java.util.function.IntConsumer consumer) { this.consumer = consumer; }
        @Override public void afterCompletion(int status) { consumer.accept(status); }
    }
}
