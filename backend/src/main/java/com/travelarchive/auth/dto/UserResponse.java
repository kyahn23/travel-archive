package com.travelarchive.auth.dto;

import com.travelarchive.user.User;

public record UserResponse(Long id, String email, String nickname, String role) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getNickname(), user.getRole());
    }
}
