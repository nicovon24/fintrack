package com.nicolas.finanzas.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.nicolas.finanzas.category.dto.CategoryResponse;
import com.nicolas.finanzas.transaction.model.Currency;
import com.nicolas.finanzas.transaction.model.Transaction;
import com.nicolas.finanzas.transaction.model.TransactionType;

public record TransactionResponse(
        Long id,
        TransactionType type,
        BigDecimal amount,
        LocalDate date,
        String description,
        CategoryResponse category,
        Currency currency,
        BigDecimal exchangeRate,
        BigDecimal amountArs
) {
    public static TransactionResponse from(Transaction transaction) {
        BigDecimal amountArs = transaction.getCurrency() == Currency.USD
                ? transaction.getAmount().multiply(transaction.getExchangeRate())
                : transaction.getAmount();

        return new TransactionResponse(
                transaction.getId(),
                transaction.getType(),
                transaction.getAmount(),
                transaction.getDate(),
                transaction.getDescription(),
                CategoryResponse.from(transaction.getCategory()),
                transaction.getCurrency(),
                transaction.getExchangeRate(),
                amountArs
        );
    }
}
