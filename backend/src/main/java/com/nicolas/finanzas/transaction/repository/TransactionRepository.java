package com.nicolas.finanzas.transaction.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nicolas.finanzas.transaction.model.Transaction;
import com.nicolas.finanzas.user.model.User;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserAndDateBetween(User user, LocalDate start, LocalDate end);

    List<Transaction> findByUser(User user);

    Optional<Transaction> findByIdAndUser(Long id, User user);
}
