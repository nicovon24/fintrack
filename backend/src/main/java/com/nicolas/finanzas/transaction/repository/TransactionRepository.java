package com.nicolas.finanzas.transaction.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nicolas.finanzas.transaction.model.Transaction;
import com.nicolas.finanzas.transaction.model.TransactionType;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByDateBetween(LocalDate start, LocalDate end);

    List<Transaction> findByTypeAndDateBetween(TransactionType type, LocalDate start, LocalDate end);

    List<Transaction> findByCategoryId(Long categoryId);

    @Query("""
            select t.category.name as categoryName, sum(t.amount) as total
            from Transaction t
            where t.date between :start and :end
            group by t.category.name
            """)
    List<CategoryTotalProjection> sumByCategoryBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    interface CategoryTotalProjection {
        String getCategoryName();
        java.math.BigDecimal getTotal();
    }
}
