package com.nicolas.finanzas.category.dto;

import com.nicolas.finanzas.transaction.model.TransactionType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CategoryRequest(
        @NotBlank(message = "El nombre es obligatorio") String name,
        @NotNull(message = "El tipo es obligatorio") TransactionType type
) {
}
