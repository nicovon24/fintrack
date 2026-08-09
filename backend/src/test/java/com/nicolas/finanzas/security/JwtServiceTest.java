package com.nicolas.finanzas.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.nicolas.finanzas.user.model.Role;
import com.nicolas.finanzas.user.model.User;

import io.jsonwebtoken.JwtException;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService(
            "test-secret-key-at-least-32-bytes-long-1234567890", 3_600_000L);

    @Test
    void generateToken_yLuegoExtractUserId_devuelveElMismoId() {
        User user = new User(42L, "google-1", "user@example.com", "Test User", null, Role.USER, null);

        String token = jwtService.generateToken(user);

        assertThat(jwtService.extractUserId(token)).isEqualTo(42L);
    }

    @Test
    void extractUserId_conTokenInvalido_lanzaJwtException() {
        assertThatThrownBy(() -> jwtService.extractUserId("token-invalido"))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void extractUserId_conTokenFirmadoConOtraClave_lanzaJwtException() {
        JwtService otherJwtService = new JwtService(
                "another-secret-key-at-least-32-bytes-long-0987654321", 3_600_000L);
        User user = new User(1L, "google-1", "user@example.com", "Test User", null, Role.USER, null);
        String token = otherJwtService.generateToken(user);

        assertThatThrownBy(() -> jwtService.extractUserId(token))
                .isInstanceOf(JwtException.class);
    }
}
