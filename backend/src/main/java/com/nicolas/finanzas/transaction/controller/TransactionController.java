package com.nicolas.finanzas.transaction.controller;

import java.time.YearMonth;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.nicolas.finanzas.transaction.dto.TransactionRequest;
import com.nicolas.finanzas.transaction.dto.TransactionResponse;
import com.nicolas.finanzas.transaction.dto.TransactionSummaryResponse;
import com.nicolas.finanzas.transaction.model.TransactionType;
import com.nicolas.finanzas.transaction.service.TransactionService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
@Tag(name = "Transacciones", description = "Gestion de ingresos y gastos")
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    @Operation(summary = "Listar transacciones, con filtros opcionales por tipo, categoria y mes (yyyy-MM)")
    public List<TransactionResponse> findAll(
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) Long categoryId,
            @Parameter(example = "2026-08")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month
    ) {
        return transactionService.findAll(type, categoryId, month);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener una transaccion por id")
    public TransactionResponse findById(@PathVariable Long id) {
        return transactionService.findById(id);
    }

    @PostMapping
    @Operation(summary = "Crear una transaccion (ingreso o gasto)")
    public ResponseEntity<TransactionResponse> create(@Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(transactionService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar una transaccion")
    public TransactionResponse update(@PathVariable Long id, @Valid @RequestBody TransactionRequest request) {
        return transactionService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar una transaccion")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        transactionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary")
    @Operation(summary = "Resumen de ingresos, gastos y totales por categoria para un mes (yyyy-MM)")
    public TransactionSummaryResponse summary(
            @Parameter(example = "2026-08", required = true)
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month
    ) {
        return transactionService.summary(month);
    }
}
