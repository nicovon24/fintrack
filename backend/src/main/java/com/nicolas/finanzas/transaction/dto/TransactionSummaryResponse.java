package com.nicolas.finanzas.transaction.dto;

import java.math.BigDecimal;
import java.util.List;

import com.nicolas.finanzas.transaction.model.Currency;

public record TransactionSummaryResponse(
        List<CurrencyTotal> byCurrency,
        CombinedTotal combinedArs,
        List<CategoryTotal> byCategory
) {
    public record CurrencyTotal(Currency currency, BigDecimal totalIncome, BigDecimal totalExpense, BigDecimal balance) {
    }

    public record CombinedTotal(BigDecimal totalIncome, BigDecimal totalExpense, BigDecimal balance) {
    }

    public record CategoryTotal(String categoryName, Currency currency, BigDecimal total) {
    }
}
