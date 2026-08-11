package com.nicolas.finanzas.iol.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

// Shape cruda del /token de IOL (snake_case). Nunca persistido, solo pasa por memoria del request.
@JsonIgnoreProperties(ignoreUnknown = true)
public record IolRawTokenResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("refresh_token") String refreshToken,
        @JsonProperty("expires_in") long expiresIn
) {
}
