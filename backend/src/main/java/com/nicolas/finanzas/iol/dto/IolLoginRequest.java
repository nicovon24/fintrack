package com.nicolas.finanzas.iol.dto;

import jakarta.validation.constraints.NotBlank;

// Nunca persistido: solo se reenvia a IOL para obtener un token.
public record IolLoginRequest(
        @NotBlank String username,
        @NotBlank String password
) {
}
