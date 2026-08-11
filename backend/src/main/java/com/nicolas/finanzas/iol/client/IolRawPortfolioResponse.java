package com.nicolas.finanzas.iol.client;

import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// Shape cruda de GET /api/v2/portafolio/{pais}. Tipada (no JsonNode): el converter de Jackson 3
// que trae Spring Boot 4 no deserializa el JsonNode de Jackson 2.
@JsonIgnoreProperties(ignoreUnknown = true)
public record IolRawPortfolioResponse(
        String pais,
        List<Activo> activos
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Activo(
            BigDecimal cantidad,
            BigDecimal ultimoPrecio,
            BigDecimal ppc,
            BigDecimal gananciaDinero,
            BigDecimal valorizado,
            Titulo titulo
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Titulo(
            String simbolo,
            String descripcion,
            String moneda
    ) {
    }
}
