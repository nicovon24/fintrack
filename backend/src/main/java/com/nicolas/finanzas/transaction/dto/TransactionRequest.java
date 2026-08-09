package com.nicolas.finanzas.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.nicolas.finanzas.transaction.model.Currency;
import com.nicolas.finanzas.transaction.model.TransactionType;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record TransactionRequest(
        @NotNull(message = "El tipo es obligatorio") TransactionType type,
        @NotNull(message = "El monto es obligatorio") @Positive(message = "El monto debe ser positivo") BigDecimal amount,
        @NotNull(message = "La fecha es obligatoria") LocalDate date,
        String description,
        @NotNull(message = "La categoria es obligatoria") Long categoryId,
        @NotNull(message = "La moneda es obligatoria") Currency currency,
        @Positive(message = "La cotizacion debe ser positiva") BigDecimal exchangeRate
) {
}
