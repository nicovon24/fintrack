# Controller Rules

## Location and base path

`com.nicolas.finanzas.{feature}.controller.{Entity}Controller`, with `@RequestMapping("/api/{feature-plural}")` (e.g. `/api/transactions`, `/api/categories`).

## Thin, delegates to the service

The controller has no business logic. Only: receives the request, validates (`@Valid`), calls the service, returns the response with the correct status code.

```java
@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
@Tag(name = "Transacciones", description = "Gestion de ingresos y gastos")
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping
    @Operation(summary = "Crear una transaccion (ingreso o gasto)")
    public ResponseEntity<TransactionResponse> create(@Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(transactionService.create(request));
    }
}
```

## Status codes

- `POST` that creates -> `201 CREATED` with the created resource in the body (`ResponseEntity.status(HttpStatus.CREATED).body(...)`).
- `GET`, `PUT` -> implicit `200 OK` (return the DTO directly, without wrapping in `ResponseEntity`, unless you need custom headers).
- `DELETE` -> `204 NO_CONTENT` (`ResponseEntity.noContent().build()`).
- Errors are handled by the global `GlobalExceptionHandler` — the controller never does try/catch to translate exceptions into HTTP status.

## Swagger

Every controller carries `@Tag(name, description)` at the class level. Every endpoint carries a short `@Operation(summary = "...")` **in Spanish** (it's text seen by whoever consumes the API, not code — see the Language Policy in `AGENTS.md`). For parameters with a special format (e.g. `YearMonth` as `yyyy-MM`), add `@Parameter(example = "2026-08")` so Swagger UI shows a useful example.

## Optional query params

Optional filters on `GET` go as `@RequestParam(required = false)`, nullable type (`Long`, not `long`; the enum directly, not a String to parse by hand). Spring MVC automatically converts the query param string to the declared enum/type.
