package com.travelarchive.storage;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@EnableConfigurationProperties(StorageProperties.class)
public class LocalFileStorageService implements StorageService {
    private final StorageProperties properties;
    private final Path root;

    public LocalFileStorageService(StorageProperties properties) {
        this.properties = properties;
        this.root = properties.getRoot().toAbsolutePath().normalize();
    }

    @Override
    public StoredFile store(MultipartFile file, StorageContext context) {
        validate(file, context);
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        String contentType = file.getContentType();
        String filename = UUID.randomUUID() + extension(originalFileName, contentType);
        String storageKey = "%d/%d/%s".formatted(context.userId(), context.tripId(), filename);
        Path destination = root.resolve(storageKey).normalize();
        if (!destination.startsWith(root)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid storage path");
        }
        try {
            Files.createDirectories(destination.getParent());
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destination, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store file", ex);
        }
        return new StoredFile(storageKey, originalFileName, contentType, file.getSize());
    }

    @Override
    public Resource open(String storageKey) {
        Path path = resolveStorageKey(storageKey);
        Resource resource = new FileSystemResource(path);
        if (!resource.exists() || !resource.isReadable()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        }
        return resource;
    }

    @Override
    public void delete(String storageKey) {
        Path path = resolveStorageKey(storageKey);
        try {
            Files.deleteIfExists(path);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not delete file", ex);
        }
    }

    private void validate(MultipartFile file, StorageContext context) {
        if (context == null || context.userId() == null || context.tripId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Storage context is required");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is required");
        }
        if (file.getSize() > properties.getMaxFileSizeBytes()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must be 5MB or smaller");
        }
        if (!properties.getAllowedContentTypes().contains(file.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported image type");
        }
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        if (!StringUtils.hasText(originalFileName) || originalFileName.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
        }
        validateMagicBytes(file);
    }

    private void validateMagicBytes(MultipartFile file) {
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read file", ex);
        }
        boolean matches = switch (file.getContentType()) {
            case "image/jpeg" -> bytes.length >= 2 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8;
            case "image/png" -> bytes.length >= 4 && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50
                    && bytes[2] == 0x4E && bytes[3] == 0x47;
            case "image/webp" -> bytes.length >= 12 && bytes[0] == 0x52 && bytes[1] == 0x49
                    && bytes[2] == 0x46 && bytes[3] == 0x46 && bytes[8] == 0x57 && bytes[9] == 0x45
                    && bytes[10] == 0x42 && bytes[11] == 0x50;
            default -> false;
        };
        if (!matches) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image content does not match content type");
        }
    }

    private Path resolveStorageKey(String storageKey) {
        if (!StringUtils.hasText(storageKey)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Storage key is required");
        }
        Path path = root.resolve(storageKey).normalize();
        if (!path.startsWith(root)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid storage path");
        }
        return path;
    }

    private String extension(String originalFileName, String contentType) {
        int dot = originalFileName.lastIndexOf('.');
        if (dot >= 0 && dot < originalFileName.length() - 1) {
            return originalFileName.substring(dot).toLowerCase(Locale.ROOT);
        }
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }
}
