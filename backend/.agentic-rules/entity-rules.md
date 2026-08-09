# Entity Rules

## Location

`com.nicolas.finanzas.{feature}.model.{Entity}`. If the feature has a single related type (e.g. an enum), it also goes in `model/` (see `TransactionType` next to `Transaction`).

## Standard annotations

Every JPA entity carries this set of Lombok + JPA annotations:

```java
@Entity
@Table(name = "table_name_snake_case")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EntityName {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // remaining fields
}
```

- `@NoArgsConstructor` is required by Hibernate.
- `@AllArgsConstructor` is used in tests to build entities quickly (see `testing-rules.md`).
- Don't use `@Data` — it's more explicit to use `@Getter`/`@Setter` separately, and it avoids `@Data`'s automatic `equals`/`hashCode`/`toString` which can cause problems with JPA relations (infinite recursion in `toString`, `equals` broken with Hibernate proxies).

## Enums

Domain enums (e.g. `TransactionType`) are mapped with:

```java
@Enumerated(EnumType.STRING)
private TransactionType type;
```

Always `EnumType.STRING`, never `ORDINAL` — if the enum is reordered in the future, `ORDINAL` silently corrupts existing data.

## Relations

- Use `@ManyToOne` for references to another feature (e.g. `Transaction.category -> Category`). Avoid bidirectional `@OneToMany` unless there's a concrete reason — it adds complexity (maintaining both sides of the relation, serialization issues) that isn't justified in most cases.
- An entity can reference another feature's entity directly in its model (this is normal in JPA, the relation lives in the database). What must not happen is a **service** or **repository** of one feature calling another feature's repository directly — that always goes through the owning feature's service (see `service-rules.md`).

## No business logic

Entities are data + JPA mapping only. No methods with business logic, complex validations, or calls to other services from the entity. That logic goes in `service/`.
