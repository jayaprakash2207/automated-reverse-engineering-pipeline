# Application Scaffold

Empty, buildable project skeleton for the target stack confirmed in the Stack Mapping Contract:

- **Backend:** Java 17, Spring Boot 3.x, Spring Data JPA, Flyway, Spring Security 6 (JWT to be wired in by the Security agent)
- **Frontend:** React 18 + TypeScript, built with Vite, tested with Jest + React Testing Library
- **Database:** PostgreSQL (migrated off Oracle) — schema owned exclusively by Flyway migrations

No domain/feature code exists yet. This is scaffolding only: a health-check endpoint on the backend, a placeholder screen on the frontend, and the folder structure both sides will grow into per the contract.

## Repository layout

```
backend/     Spring Boot application (Maven)
frontend/    React + TypeScript application (Vite)
docker-compose.yml   Local PostgreSQL for development
```

Backend follows package-by-feature: `com.example.app.{module}.{controller,service,repository,domain,dto,validator}`, with shared code in `com.example.app.common`. No feature modules are pre-created — they get added only as real `BR-*` requirements are confirmed.

Frontend mirrors this: `src/features/{module}/{components,hooks,api,types}` (added as modules are confirmed) and `src/shared/` for cross-feature code.

## Prerequisites

- JDK 17
- Maven 3.9+ (or use the wrapper once added)
- Node.js 18+ and npm
- Docker (for local PostgreSQL and for Testcontainers-based integration tests)

## Running locally

### 1. Start PostgreSQL

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with database `appdb`, user `appuser`, password `apppassword` (see `docker-compose.yml`). Override any of these via environment variables described below.

### 2. Backend

```bash
cd backend
mvn spring-boot:run
```

The app starts on `http://localhost:8080`. On startup, Flyway runs the migrations in `src/main/resources/db/migration` against the configured database.

Health check: `GET http://localhost:8080/actuator/health`

Environment variables (all optional, defaults point at the docker-compose database):

| Variable | Default |
|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/appdb` |
| `DB_USERNAME` | `appuser` |
| `DB_PASSWORD` | `apppassword` |
| `SERVER_PORT` | `8080` |

Run backend tests (unit + Testcontainers integration tests, requires Docker running):

```bash
cd backend
mvn test
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app starts on `http://localhost:3000`.

Run frontend tests:

```bash
cd frontend
npm test
```

Build for production:

```bash
cd frontend
npm run build
```

## Conventions

All code added to this repository must follow the binding conventions in the Stack Mapping Contract (Forward Engineering — Document 12 Successor), including but not limited to:

- No database triggers — side effects belong in the service layer inside the same transaction.
- All schema changes go through Flyway migrations (`V{major}.{minor}__{snake_case_description}.sql`); no manual DDL against shared databases.
- Constructor injection only (`@RequiredArgsConstructor`), no field-level `@Autowired`.
- Entities never returned from controllers — always map to DTOs.
- No hard-coded secrets or encryption keys anywhere.
- Audit writes are part of the same transaction as the action they record (fail-closed).

See the contract document for the full binding conventions.
