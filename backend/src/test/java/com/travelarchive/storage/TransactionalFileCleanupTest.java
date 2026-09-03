package com.travelarchive.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class TransactionalFileCleanupTest {

    private final StorageService storage = mock(StorageService.class);
    private final TransactionalFileCleanup cleanup = new TransactionalFileCleanup(storage);

    @AfterEach
    void clearSynchronizations() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clear();
        }
        TransactionSynchronizationManager.unbindResourceIfPossible(new Object());
    }

    @Test
    void requiresActiveTransaction() {
        assertThatThrownBy(() -> cleanup.registerAfterCommit("k"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("active Spring-managed transaction");
        verify(storage, never()).delete(anyString());
    }

    @Test
    void afterCommitDeletesKey() {
        TransactionSynchronizationManager.initSynchronization();
        try {
            cleanup.registerAfterCommit("key-a");
            fireAfterCommit();
            verify(storage, times(1)).delete("key-a");
        } finally {
            TransactionSynchronizationManager.clear();
        }
    }

    @Test
    void afterCommitDeletesAllKeysInList() {
        TransactionSynchronizationManager.initSynchronization();
        try {
            cleanup.registerAfterCommit(List.of("a", "b", "c"));
            fireAfterCommit();
            verify(storage).delete("a");
            verify(storage).delete("b");
            verify(storage).delete("c");
        } finally {
            TransactionSynchronizationManager.clear();
        }
    }

    @Test
    void rollbackDeletesKeyAndCommitSkipsIt() {
        TransactionSynchronizationManager.initSynchronization();
        try {
            cleanup.registerRollbackDelete("key-r");
            fireCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
            verify(storage).delete("key-r");
        } finally {
            TransactionSynchronizationManager.clear();
        }

        TransactionSynchronizationManager.initSynchronization();
        try {
            cleanup.registerRollbackDelete("key-c");
            fireCompletion(TransactionSynchronization.STATUS_COMMITTED);
            verify(storage, never()).delete("key-c");
        } finally {
            TransactionSynchronizationManager.clear();
        }
    }

    @Test
    void storageIoExceptionIsSwallowed() {
        TransactionSynchronizationManager.initSynchronization();
        doThrow(new RuntimeException("boom")).when(storage).delete("k-fail");
        try {
            cleanup.registerAfterCommit("k-fail");
            fireAfterCommit();
            verify(storage).delete("k-fail");
            assertThat(true).isTrue();
        } finally {
            TransactionSynchronizationManager.clear();
        }
    }

    @Test
    void emptyKeyIsSkipped() {
        TransactionSynchronizationManager.initSynchronization();
        try {
            cleanup.registerAfterCommit("");
            cleanup.registerAfterCommit((String) null);
            fireAfterCommit();
            verify(storage, never()).delete(anyString());
        } finally {
            TransactionSynchronizationManager.clear();
        }
    }

    private void fireAfterCommit() {
        for (TransactionSynchronization ts : TransactionSynchronizationManager.getSynchronizations()) {
            ts.afterCommit();
        }
    }

    private void fireCompletion(int status) {
        for (TransactionSynchronization ts : TransactionSynchronizationManager.getSynchronizations()) {
            ts.afterCompletion(status);
        }
    }
}
