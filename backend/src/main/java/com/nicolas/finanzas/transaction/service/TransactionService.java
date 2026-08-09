package com.nicolas.finanzas.transaction.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import org.springframework.stereotype.Service;

import com.nicolas.finanzas.category.model.Category;
import com.nicolas.finanzas.category.service.CategoryService;
import com.nicolas.finanzas.exception.ResourceNotFoundException;
import com.nicolas.finanzas.transaction.dto.TransactionRequest;
import com.nicolas.finanzas.transaction.dto.TransactionResponse;
import com.nicolas.finanzas.transaction.dto.TransactionSummaryResponse;
import com.nicolas.finanzas.transaction.model.Transaction;
import com.nicolas.finanzas.transaction.model.TransactionType;
import com.nicolas.finanzas.transaction.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryService categoryService;

    public List<TransactionResponse> findAll(TransactionType type, Long categoryId, YearMonth month) {
        List<Transaction> transactions = month != null
                ? transactionRepository.findByDateBetween(month.atDay(1), month.atEndOfMonth())
                : transactionRepository.findAll();

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
        LocalDate start = month.atDay(1);
        LocalDate end = month.atEndOfMonth();

        List<Transaction> transactions = transactionRepository.findByDateBetween(start, end);

        BigDecimal totalIncome = sumByType(transactions, TransactionType.INCOME);
        BigDecimal totalExpense = sumByType(transactions, TransactionType.EXPENSE);

        List<TransactionSummaryResponse.CategoryTotal> byCategory = transactionRepository
                .sumByCategoryBetween(start, end)
                .stream()
                .map(p -> new TransactionSummaryResponse.CategoryTotal(p.getCategoryName(), p.getTotal()))
                .toList();

        return new TransactionSummaryResponse(totalIncome, totalExpense, totalIncome.subtract(totalExpense), byCategory);
    }

    private BigDecimal sumByType(List<Transaction> transactions, TransactionType type) {
        return transactions.stream()
                .filter(t -> t.getType() == type)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void applyRequest(Transaction transaction, TransactionRequest request, Category category) {
        transaction.setType(request.type());
        transaction.setAmount(request.amount());
        transaction.setDate(request.date());
        transaction.setDescription(request.description());
        transaction.setCategory(category);
    }

    private Transaction getTransactionOrThrow(Long id) {
        return transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaccion no encontrada: " + id));
    }
}
