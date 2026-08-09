package com.nicolas.finanzas.user.service;

import java.time.Instant;

import org.springframework.stereotype.Service;

import com.nicolas.finanzas.user.model.Role;
import com.nicolas.finanzas.user.model.User;
import com.nicolas.finanzas.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final String ADMIN_EMAIL = "nicovon24@gmail.com";

    private final UserRepository userRepository;

    public User findOrCreateFromGoogle(String googleId, String email, String name, String pictureUrl) {
        return userRepository.findByGoogleId(googleId)
                .orElseGet(() -> {
                    User user = new User();
                    user.setGoogleId(googleId);
                    user.setEmail(email);
                    user.setName(name);
                    user.setPictureUrl(pictureUrl);
                    user.setRole(ADMIN_EMAIL.equalsIgnoreCase(email) ? Role.ADMIN : Role.USER);
                    user.setCreatedAt(Instant.now());
                    return userRepository.save(user);
                });
    }
}
