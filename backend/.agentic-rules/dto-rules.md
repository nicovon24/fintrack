# DTO Rules

## Location and naming

`com.nicolas.finanzas.{feature}.dto.{Name}`. Always prefix with the feature name so the type is understandable even when imported from another package: `TransactionRequest`, `TransactionResponse`, `TransactionSummaryResponse` — not bare `Request`, `Response`, `Summary`.

## Records, not classes

Every DTO is a Java `record`. They're immutable by design and don't need Lombok.

```java
public record TransactionRequest(
        @NotNull(message = "El tipo es obligatorio") TransactionType type,
        @NotNull(message = "El monto es obligatorio") @Positive(message = "El monto debe ser positivo") BigDecimal amount,
        @NotNull(message = "La fecha es obligatoria") LocalDate date,
        String description,
        @NotNull(message = "La categoria es obligatoria") Long categoryId
) {
}
```

## Validation on the Request

`jakarta.validation` annotations go directly on the request record's fields (`@NotNull`, `@NotBlank`, `@Positive`, etc.), with their `message` **in Spanish** (see the Language Policy in `AGENTS.md` — it's text the API consumer sees). The controller triggers them with `@Valid` on the `@RequestBody` parameter (see `controller-rules.md`). Never duplicate that validation "by hand" in the service — if a rule is needed that Bean Validation can't express (e.g. "the category must exist"), that goes in the service, but anything declaratively validatable goes in the DTO.

## `from()` factory method on the Response

Every response DTO built from an entity has a static `from(Entity)` method:

```java
public record CategoryResponse(Long id, String name, TransactionType type) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getType());
    }
}
```

This keeps the entity->DTO mapping in one place, close to the DTO itself, instead of scattered across the service.

## Nested DTOs from another feature

A `Response` can compose another feature's `Response` (e.g. `TransactionResponse.category` is a `CategoryResponse`). This is the correct way to expose related data without leaking the JPA entity — never put the `Category` entity inside a DTO, always its `CategoryResponse`.

## No MapStruct for now

The project is small and manual mappers (`from()`) are enough and easier to debug. If the project grows and the mapping becomes repetitive/complex, evaluate MapStruct then — not before.
