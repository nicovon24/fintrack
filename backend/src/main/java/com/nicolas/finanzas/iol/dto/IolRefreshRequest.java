package com.nicolas.finanzas.iol.dto;

import jakarta.validation.constraints.NotBlank;

public record IolRefreshRequest(
        @NotBlank String refreshToken
) {
}
