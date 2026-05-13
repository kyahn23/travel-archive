package com.travelarchive.common.dto;

public record ApiResponse<T>(T data, String message) {
}
