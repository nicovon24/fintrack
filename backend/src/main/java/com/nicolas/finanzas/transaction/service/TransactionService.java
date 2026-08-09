package com.nicolas.finanzas.transaction.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.nicolas.finanzas.category.model.Category;
import com.nicolas.finanzas.category.service.CategoryService;
import com.nicolas.finanzas.exception.InvalidTransactionException;
import com.nicolas.finanzas.exception.ResourceNotFoundException;
import com.nicolas.finanzas.security.CurrentUserProvider;
import com.nicolas.finanzas.transaction.dto.TransactionRequest;
import com.nicolas.finanzas.transaction.dto.TransactionResponse;
import com.nicolas.finanzas.transaction.dto.TransactionSummaryResponse;
import com.nicolas.finanzas.transaction.dto.TransactionSummaryResponse.CategoryTotal;
import com.nicolas.finanzas.transaction.dto.TransactionSummaryResponse.CombinedTotal;
import com.nicolas.finanzas.transaction.dto.TransactionSummaryResponse.CurrencyTotal;
import com.nicolas.finanzas.transaction.model.Currency;
import com.nicolas.finanzas.transaction.model.Transaction;
import com.nicolas.finanzas.transaction.model.TransactionType;
import com.nicolas.finanzas.transaction.repository.TransactionRepository;
import com.nicolas.finanzas.user.model.User;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryService categoryService;
    private final CurrentUserProvider currentUserProvider;

    public List<TransactionResponse> findAll(TransactionType type, Long categoryId, YearMonth month) {
        User user = currentUserProvider.getCurrentUser();
        List<Transaction> transactions = month != null
                ? transactionRepository.findByUserAndDateBetween(user, month.atDay(1), month.atEndOfMonth())
                : transactionRepository.findByUser(user);

        return transactions.stream()
                .filter(t -> type == null || t.getType() == type)
                .filter(t -> categoryId == null || t.getCategory().getId().equals(categoryId))
                .map(TransactionResponse::from)
                .toList();
    }

    public TransactionResponse findById(Long id) {
        return TransactionResponse.from(getTransactionOrThrow(id));
    }

    public TransactionResponse create(TransactionRequest request) {
        Category category = categoryService.getCategoryOrThrow(request.categoryId());
        Transaction transaction = new Transaction();
        transaction.setUser(currentUserProvider.getCurrentUser());
        applyRequest(transaction, request, category);
        return TransactionResponse.from(transactionRepository.save(transaction));
    }

    public TransactionResponse update(Long id, TransactionRequest request) {
        Transaction transaction = getTransactionOrThrow(id);
        Category category = categoryService.getCategoryOrThrow(request.categoryId());
        applyRequest(transaction, request, category);
        return TransactionResponse.from(transactionRepository.save(transaction));
    }

    public void delete(Long id) {
        Transaction transaction = getTransactionOrThrow(id);
        transactionRepository.delete(transaction);
    }

    public TransactionSummaryResponse summary(YearMonth month) {
        User user = currentUserProvider.getCurrentUser();
        LocalDate start = month.atDay(1);
        LocalDate end = month.atEndOfMonth();

        List<Transaction> transactions = transactionRepository.findByUserAndDateBetween(user, start, end);

        List<CurrencyTotal> byCurrency = transactions.stream()
                .map(Transaction::getCurrency)
                .distinct()
                .sorted()
                .map(currency -> {
                    List<Transaction> inCurrency = transactions.stream()
                            .filter(t -> t.getCurrency() == currency)
                            .toList();
                    BigDecimal income = sumByType(inCurrency, TransactionType.INCOME);
                    BigDecimal expense = sumByType(inCurrency, TransactionType.EXPENSE);
                    return new CurrencyTotal(currency, income, expense, income.subtract(expense));
                })
                .toList();

        BigDecimal combinedIncome = sumAmountArsByType(transactions, TransactionType.INCOME);
        BigDecimal combinedExpense = sumAmountArsByType(transactions, TransactionType.EXPENSE);
        CombinedTotal combinedArs = new CombinedTotal(combinedIncome, combinedExpense, combinedIncome.subtract(combinedExpense));

        List<CategoryTotal> byCategory = transactions.stream()
                .collect(Collectors.groupingBy(
                        t -> Map.entry(t.getCategory().getName(), t.getCurrency()),
                        Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)))
                .entrySet().stream()
                .map(e -> new CategoryTotal(e.getKey().getKey(), e.getKey().getValue(), e.getValue()))
                .sorted(Comparator.comparing(CategoryTotal::categoryName).thenComparing(CategoryTotal::currency))
                .toList();

        return new TransactionSummaryResponse(byCurrency, combinedArs, byCategory);
    }

    private BigDecimal sumByType(List<Transaction> transactions, TransactionType type) {
        return transactions.stream()
                .filter(t -> t.getType() == type)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumAmountArsByType(List<Transaction> transactions, TransactionType type) {
        return transactions.stream()
                .filter(t -> t.getType() == type)
                .map(this::amountInArs)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal amountInArs(Transaction transaction) {
        return transaction.getCurrency() == Currency.USD
                ? transaction.getAmount().multiply(transaction.getExchangeRate())
                : transaction.getAmount();
    }

    private void applyRequest(Transaction transaction, TransactionRequest request, Category category) {
        validateCurrency(request);
        transaction.setType(request.type());
        transaction.setAmount(request.amount());
        transaction.setDate(request.date());
        transaction.setDescription(request.description());
        transaction.setCategory(category);
        transaction.setCurrency(request.currency());
        transaction.setExchangeRate(request.exchangeRate());
    }

    private void validateCurrency(TransactionRequest request) {
        if (request.currency() == Currency.USD && request.exchangeRate() == null) {
            throw new InvalidTransactionException("La cotizacion es obligatoria para transacciones en USD");
        }
        if (request.currency() == Currency.ARS && request.exchangeRate() != null) {
            throw new InvalidTransactionException("La cotizacion no aplica para transacciones en ARS");
        }
    }

    private Transaction getTransactionOrThrow(Long id) {
        return transactionRepository.findByIdAndUser(id, currentUserProvider.getCurrentUser())
                .orElseThrow(() -> new ResourceNotFoundException("Transaccion no encontrada: " + id));
    }
}
