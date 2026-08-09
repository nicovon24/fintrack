# FinTrack

App personal de finanzas: gestión de ingresos y gastos (con import de tus excels existentes) y análisis de inversiones (cotizaciones en tiempo real, ARS/USD). Proyecto de aprendizaje para practicar Java/Spring Boot en profundidad y Angular, de cara a un puesto que combina ambos stacks.

## Estructura

```text
fintrack/
├── backend/     # Java 25 + Spring Boot 4 + PostgreSQL (Maven)
└── frontend/    # Angular (todavía no iniciado)
```

Cada subcarpeta tiene su propio `AGENTS.md` con las convenciones de código de esa parte del stack — léelo antes de tocar código ahí, ya sea vos o un agente de IA.

## Roadmap

1. ✅ **v1 backend**: CRUD de ingresos/gastos y categorías, resumen mensual, Swagger.
2. 🔜 Import de excels existentes (Apache POI) — cargar un año completo de gastos/ingresos de una.
3. 🔜 Frontend Angular: dashboard con gráficos sobre los datos del backend.
4. 🔜 Módulo de inversiones: tenencias, cotizaciones en tiempo real (dólar blue/oficial, IOL), toggle ARS/USD.

## Getting started (backend)

```bash
cd backend
docker compose up -d          # levanta Postgres local
./mvnw spring-boot:run        # requiere JDK 25 activo
```

- API: `http://localhost:8082`
- Swagger UI: `http://localhost:8082/swagger-ui/index.html`

```bash
./mvnw test                   # correr los tests
```

## Documentación

- `backend/AGENTS.md` + `backend/.agentic-rules/` — convenciones de código por capa (entity, dto, repository, service, controller, testing).
- `backend/docs/specs/` — specs de cada feature. Antes de implementar algo no trivial, se escribe una spec ahí primero (ver `_TEMPLATE.md`).
