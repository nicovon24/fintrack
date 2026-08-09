package com.nicolas.finanzas.transaction.dto;

import java.math.BigDecimal;
import java.util.List;

public record TransactionSummaryResponse(
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal balance,
        List<CategoryTotal> byCategory
) {
    public record CategoryTotal(String categoryName, BigDecimal total) {
    }
}
