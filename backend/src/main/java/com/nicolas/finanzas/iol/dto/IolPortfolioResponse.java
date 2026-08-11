package com.nicolas.finanzas.iol.dto;

import java.math.BigDecimal;
import java.util.List;

// cashArs/cashUsd: efectivo disponible en la cuenta. Sumado a los titulos da el total que muestra
// IOL en pantalla (el efectivo no tiene costo de compra, asi que no entra en la variacion).
public record IolPortfolioResponse(
        List<IolHoldingResponse> holdings,
        BigDecimal cashArs,
        BigDecimal cashUsd
) {
}
