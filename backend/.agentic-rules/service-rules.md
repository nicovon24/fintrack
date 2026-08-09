# Service Rules

## Location

`com.nicolas.finanzas.{feature}.service.{Entity}Service`. Concrete class with `@Service` — no interface + implementation unless there really is more than one implementation (there isn't today; don't create `CategoryService`/`CategoryServiceImpl` "just in case").

## Dependency injection

Lombok's `@RequiredArgsConstructor` over `private final` fields. Never `@Autowired` on fields.

```java
@Service
@RequiredArgsConstructor
public class TransactionService {
    private final TransactionRepository transactionRepository;
    private final CategoryService categoryService;
    ...
}
```

## Communication between features

When a service needs data from another feature, it injects that feature's **service** (never its repository or entity from outside). The method called cross-feature must be explicitly `public` to make clear it's part of the feature's internal API:

```java
// In CategoryService — public on purpose, used by TransactionService
public Category getCategoryOrThrow(Long id) {
    return categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Categoria no encontrada: " + id));
}
```

## Handling "not found"

Use `ResourceNotFoundException` (in `com.nicolas.finanzas.exception`, shared) with `orElseThrow`. Its message is in Spanish (see the Language Policy in `AGENTS.md`) since it flows straight into the API error response. `GlobalExceptionHandler` translates it to 404 automatically — the service never builds the HTTP response, that's the controller/exception handler's responsibility.

## Entity <-> DTO conversion

The service receives `Request` DTOs and returns `Response` DTOs. Response<-Entity conversion is delegated to the DTO's own static `from()` (see `dto-rules.md`); Request->Entity conversion (setting fields) happens in the service because that's where the logic of "which fields can be updated" lives.

## Private helper methods

Internal logic that isn't part of the service's public API (e.g. `applyRequest()`, `sumByType()`) goes as a `private` method at the end of the class, after the public methods.
