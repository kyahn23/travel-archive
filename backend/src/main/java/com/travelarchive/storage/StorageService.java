package com.travelarchive.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    StoredFile store(MultipartFile file, StorageContext context);

    Resource open(String storageKey);

    void delete(String storageKey);
}
