package com.nicolas.finanzas.category.dto;

import com.nicolas.finanzas.category.model.Category;
import com.nicolas.finanzas.transaction.model.TransactionType;

public record CategoryResponse(
        Long id,
        String name,
        TransactionType type
) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getType());
    }
}
