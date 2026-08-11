package com.nicolas.finanzas.iol.dto;

import java.math.BigDecimal;

// Ojo: qty * price NO da value, ni qty * avgCost da cost. Los bonos argentinos cotizan cada 100
// nominales (factor 0.01) y las acciones no, asi que value y cost salen de los totales que ya
// calcula IOL (valorizado / gananciaDinero) en vez de multiplicarlos aca.
public record IolHoldingResponse(
        String ticker,
        String name,
        BigDecimal qty,
        BigDecimal avgCost,
        BigDecimal price,
        String currency,
        BigDecimal value,
        BigDecimal cost,
        BigDecimal result
) {
}
