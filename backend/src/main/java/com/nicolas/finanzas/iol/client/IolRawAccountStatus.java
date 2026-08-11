package com.nicolas.finanzas.iol.client;

import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// Shape cruda de GET /api/v2/estadocuenta. Solo interesa el efectivo disponible por moneda:
// los titulos ya los trae el endpoint de portafolio.
@JsonIgnoreProperties(ignoreUnknown = true)
public record IolRawAccountStatus(
        List<Cuenta> cuentas
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Cuenta(
            String tipo,
            String moneda,
            BigDecimal disponible
    ) {
    }
}
