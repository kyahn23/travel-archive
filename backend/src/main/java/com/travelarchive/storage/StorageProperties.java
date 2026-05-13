package com.travelarchive.storage;

import java.nio.file.Path;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "storage.local")
public class StorageProperties {
    private Path root = Path.of("storage", "uploads");
    private long maxFileSizeBytes = 5L * 1024 * 1024;
    private Set<String> allowedContentTypes = Set.of("image/jpeg", "image/png", "image/webp");

    public Path getRoot() {
        return root;
    }

    public void setRoot(Path root) {
        this.root = root;
    }

    public long getMaxFileSizeBytes() {
        return maxFileSizeBytes;
    }

    public void setMaxFileSizeBytes(long maxFileSizeBytes) {
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    public Set<String> getAllowedContentTypes() {
        return allowedContentTypes;
    }

    public void setAllowedContentTypes(Set<String> allowedContentTypes) {
        this.allowedContentTypes = allowedContentTypes;
    }
}
