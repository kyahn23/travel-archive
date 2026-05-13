package com.travelarchive.storage;

public record StoredFile(String storageKey, String originalFileName, String contentType, Long fileSize) {
}
