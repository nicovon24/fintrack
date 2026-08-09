package com.nicolas.finanzas.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.nicolas.finanzas.category.dto.CategoryResponse;
import com.nicolas.finanzas.transaction.model.Transaction;
import com.nicolas.finanzas.transaction.model.TransactionType;

public record TransactionResponse(
        Long id,
        TransactionType type,
        BigDecimal amount,
        LocalDate date,
        String description,
        CategoryResponse category
) {
    public static TransactionResponse from(Transaction transaction) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getType(),
                transaction.getAmount(),
                transaction.getDate(),
                transaction.getDescription(),
                CategoryResponse.from(transaction.getCategory())
        );
    }
}
