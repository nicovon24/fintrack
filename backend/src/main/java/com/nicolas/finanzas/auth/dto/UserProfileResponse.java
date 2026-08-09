package com.nicolas.finanzas.auth.dto;

import com.nicolas.finanzas.user.model.Role;
import com.nicolas.finanzas.user.model.User;

public record UserProfileResponse(
        Long id,
        String email,
        String name,
        String pictureUrl,
        Role role
) {
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(user.getId(), user.getEmail(), user.getName(), user.getPictureUrl(), user.getRole());
    }
}
