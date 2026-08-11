package com.nicolas.finanzas.iol.dto;

// Nunca persistido: el frontend lo guarda en sessionStorage, el backend lo descarta apenas responde.
public record IolTokenResponse(
        String accessToken,
        String refreshToken,
        long expiresInSeconds
) {
}
