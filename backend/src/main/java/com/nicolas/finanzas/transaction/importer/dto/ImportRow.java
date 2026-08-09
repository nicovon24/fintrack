package com.nicolas.finanzas.transaction.importer.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.nicolas.finanzas.transaction.model.Currency;
import com.nicolas.finanzas.transaction.model.TransactionType;

public record ImportRow(
        LocalDate date,
        TransactionType type,
        String category,
        String description,
        BigDecimal amount,
        Currency currency,
        BigDecimal exchangeRate
) {
}
