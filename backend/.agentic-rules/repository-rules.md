# Repository Rules

## Location

`com.nicolas.finanzas.{feature}.repository.{Entity}Repository`, interface extending `JpaRepository<Entity, Long>`.

## Derived queries first

For simple filters, use name-derived methods before `@Query`:

```java
List<Transaction> findByDateBetween(LocalDate start, LocalDate end);
List<Transaction> findByCategoryId(Long categoryId);
```

They're easier to read and Spring Data implements them on its own. Fall back to `@Query` (JPQL) only when the query can't be reasonably expressed by method name (joins with aggregation, projections, etc.).

## Projections for aggregates

When a query returns aggregated data (sums, counts) instead of the full entity, use a **projection interface** nested in the repository, not a feature DTO:

```java
@Query("""
        select t.category.name as categoryName, sum(t.amount) as total
        from Transaction t
        where t.date between :start and :end
        group by t.category.name
        """)
List<CategoryTotalProjection> sumByCategoryBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

interface CategoryTotalProjection {
    String getCategoryName();
    BigDecimal getTotal();
}
```

The service converts the projection into the real DTO that goes out through the API (see `TransactionService.summary()`).

## Never access another feature's repository

A repository (or any code within a feature) never injects or calls another feature's repository. If `transaction` needs data from `category`, it goes through `CategoryService` (see `service-rules.md`). This keeps each feature owning its own table.
