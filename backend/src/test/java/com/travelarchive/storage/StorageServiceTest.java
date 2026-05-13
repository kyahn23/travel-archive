package com.travelarchive.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

class StorageServiceTest {
    @TempDir
    Path tempDir;

    private LocalFileStorageService storageService;

    @BeforeEach
    void setUp() {
        StorageProperties properties = new StorageProperties();
        properties.setRoot(tempDir);
        storageService = new LocalFileStorageService(properties);
    }

    @Test
    void storesImagesUnderUserAndTripDirectoryWithUuidName() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "seoul.jpg", "image/jpeg", jpegBytes());

        StoredFile storedFile = storageService.store(file, new StorageContext(7L, 42L));

        assertThat(storedFile.originalFileName()).isEqualTo("seoul.jpg");
        assertThat(storedFile.contentType()).isEqualTo("image/jpeg");
        assertThat(storedFile.fileSize()).isEqualTo(4L);
        assertThat(storedFile.storageKey()).startsWith("7/42/").endsWith(".jpg");
        assertThat(Path.of(storedFile.storageKey()).getFileName().toString()).isNotEqualTo("seoul.jpg");
        assertThat(Files.readAllBytes(tempDir.resolve(storedFile.storageKey()))).isEqualTo(jpegBytes());

        Resource opened = storageService.open(storedFile.storageKey());
        assertThat(opened.exists()).isTrue();
        assertThat(opened.contentLength()).isEqualTo(4L);
    }

    @Test
    void rejectsUnsupportedTypesOversizedFilesAndPathTraversalNames() {
        byte[] oversized = new byte[(int) (5L * 1024 * 1024 + 1)];

        assertThatThrownBy(() -> storageService.store(
                new MockMultipartFile("file", "note.txt", "text/plain", "x".getBytes()), new StorageContext(1L, 1L)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Unsupported image type");
        assertThatThrownBy(() -> storageService.store(
                new MockMultipartFile("file", "large.png", "image/png", oversized), new StorageContext(1L, 1L)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("5MB");
        assertThatThrownBy(() -> storageService.store(
                new MockMultipartFile("file", "../evil.jpg", "image/jpeg", "x".getBytes()), new StorageContext(1L, 1L)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid file name");
        assertThatThrownBy(() -> storageService.store(
                new MockMultipartFile("file", "fake.jpg", "image/jpeg", "hello".getBytes()), new StorageContext(1L, 1L)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Image content does not match content type");
    }

    @Test
    void preventsOpeningOutsideRootAndDeletesStoredFile() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.webp", "image/webp", webpBytes());
        StoredFile storedFile = storageService.store(file, new StorageContext(2L, 3L));

        storageService.delete(storedFile.storageKey());

        assertThat(Files.exists(tempDir.resolve(storedFile.storageKey()))).isFalse();
        assertThatThrownBy(() -> storageService.open("../outside.jpg"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid storage path");
    }

    private byte[] jpegBytes() {
        return new byte[]{(byte) 0xFF, (byte) 0xD8, 0x01, 0x02};
    }

    private byte[] webpBytes() {
        return new byte[]{0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50};
    }
}
