package com.travelarchive.auth.dto;

public record TokenResponse(String tokenType, long accessTokenExpiresInSeconds) {
}
