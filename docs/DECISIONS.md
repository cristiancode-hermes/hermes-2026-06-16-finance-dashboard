# Architecture Decision Records (ADRs)

This document captures the key architectural decisions made during the development of the Personal Finance Dashboard, along with their context, alternatives considered, and consequences.

---

## ADR-001: SQLite for Local Development, PostgreSQL-Compatible Design

**Status:** Accepted  
**Date:** 2026-06-16  
**Deciders:** Project lead

### Context

The project needs a data store that is easy to set up for local development while leaving the door open for production deployment on a cloud PostgreSQL service (Neon). We wanted zero configuration for new developers — no Docker, no database server installation.

### Decision

Use SQLite via the `better-sqlite3` driver for local development, but write all code as if targeting PostgreSQL. Concretely:

- Entities use standard SQL types that have equivalents in both databases (`real` → `double precision`, `int` → `integer`, `date` → `date`).
- All business logic is written in TypeORM's query builder with parameterized queries.
- The only SQLite-specific functions used are `strftime()` in aggregation queries, which have well-known PostgreSQL equivalents (`EXTRACT`, `TO_CHAR`).
- The `type` property in `TypeOrmModule.forRootAsync()` is the **only** thing that changes between environments.

### Alternatives Considered

- **PostgreSQL from the start** via Docker: Adds Docker as a prerequisite, increases onboarding friction.
- **SQL.js**: Also SQLite but in pure JS — slower than native `better-sqlite3`.
- **LowDB / JSON file**: Too limited for relational queries (joins, aggregations).

### Consequences

- ✅ Zero-config development: clone, `npm install`, `npm start`, and go.
- ✅ All TypeORM abstractions work identically in both databases.
- ❌ Must remember to swap `strftime()` calls before going to production.
- ❌ Cannot use PostgreSQL-specific features like `GIN` indexes, `ARRAY` columns, or native `ENUM` types.
- ⚠️ The `simple-enum` TypeORM decorator stores enums as plain strings; migration to Postgres should add a CHECK constraint.

---

## ADR-002: JWT Auth Over Session-Based Auth

**Status:** Accepted  
**Date:** 2026-06-16  
**Deciders:** Project lead

### Context

The application needs user authentication. Options included session-based auth (server-side session stored in memory or database) and stateless JWT tokens.

### Decision

Use JWT (JSON Web Token) with Passport.js strategy. The JWT is issued on login/register, stored in `localStorage` on the frontend, and sent as an `Authorization: Bearer *** header with every API request.

Key configuration:
- Algorithm: HS256 (default for `@nestjs/jwt`)
- Expiration: 7 days
- Payload: `{ sub: user.id, email: user.email }`
- Secret: from `JWT_SECRET` env var (with hardcoded fallback for dev)

### Alternatives Considered

- **Express-session with connect-sqlite3**: Requires session store lookups on every request, adds latency, and sessions don't survive server restarts.
- **OAuth2 / Auth0**: Overkill for a personal finance app with a handful of users.
- **Passport-local sessions**: Same issues as express-session, plus more complex CSRF protection needed.

### Consequences

- ✅ Stateless: no server-side session storage needed — any API instance can validate a token.
- ✅ Simple frontend integration: `localStorage.getItem('token')` → `Authorization` header.
- ✅ Easy to test: tokens can be generated in tests without hitting a session store.
- ❌ Token revocation is not built-in (would need a blocklist). For this app, the 7-day expiry is acceptable.
- ❌ Token stored in `localStorage` is vulnerable to XSS, but the app has no user-generated content vectors.

---

## ADR-003: Angular 22 Signals Over RxJS for State

**Status:** Accepted  
**Date:** 2026-06-16  
**Deciders:** Project lead

### Context

Angular 22 introduced signals (`signal()`, `computed()`, `effect()`) as a first-class reactivity primitive. The project needed to decide whether to manage component state with signals or continue using RxJS `BehaviorSubject` + `async` pipe patterns.

### Decision

Use Angular signals for all local component state (loading flags, error messages, data arrays) and RxJS only for HTTP calls (which return Observables from Angular's `HttpClient`). Every component follows this pattern:

```typescript
data = signal<DataType | null>(null);
loading = signal(true);
error = signal<string | null>(null);

loadData(): void {
  this.loading.set(true);
  this.api.getData().subscribe({
    next: (res) => { this.data.set(res); this.loading.set(false); },
    error: (err) => { this.error.set(err.message); this.loading.set(false); },
  });
}
```

### Alternatives Considered

- **Pure RxJS** (`BehaviorSubject` + `async` pipe in template): Works but verbose. Template needs `data$ | async` which handles null/undefined differently. Updating state requires `.next()` and `.pipe()` chains.
- **NgRx / Elf / Akita**: State management libraries appropriate for much larger apps. This app's state is per-page and doesn't need global stores.
- **Angular's traditional two-way binding**: Works for forms but doesn't give reactive computed values.

### Consequences

- ✅ Significantly less boilerplate than RxJS for UI state.
- ✅ `computed()` gives automatic derived values (e.g., `netAmount = computed(() => totalIncome() - totalExpenses())`) that update when dependencies change.
- ✅ Template reads signals with `()` syntax — no `async` pipe needed, no subscription management.
- ✅ Works seamlessly with `provideZonelessChangeDetection()`.
- ❌ Developers need to learn the signals mental model (getter/setter pattern, read vs write semantics).
- ❌ Signals don't compose with RxJS operators natively (need `toObservable` / `toSignal` interop).

---

## ADR-004: TypeORM Over Raw SQL / Prisma

**Status:** Accepted  
**Date:** 2026-06-16  
**Deciders:** Project lead

### Context

The project needed an ORM or query builder for TypeScript. Options included TypeORM (the most mature NestJS-integrated ORM), Prisma (modern with great DX), and raw SQL via `better-sqlite3`'s synchronous API.

### Decision

Use TypeORM with NestJS integration. Key factors:

- **@nestjs/typeorm** provides `@InjectRepository()` for clean DI — no manual repository wiring.
- **Entity decorators** (`@Entity`, `@Column`, `@ManyToOne`) keep schema definition co-located with business logic.
- **`synchronize: true`** gives instant schema evolution in development — no migration files needed during rapid prototyping.
- TypeORM's **QueryBuilder** handles complex aggregations (dashboard, budget summaries) while keeping type safety.

### Alternatives Considered

- **Prisma**: Excellent DX with auto-generated client. Rejected because the schema file is separate from NestJS decorators, adding indirection. Also, Prisma's migration workflow is heavier for a project that uses `synchronize` in dev.
- **Raw SQL with `better-sqlite3`**: Maximum control but loses type safety, composability, and auto-migration. Every query would need manual table creation.
- **Knex.js**: Query builder only, no ORM features. Would need a separate schema management tool.

### Consequences

- ✅ Tight NestJS integration: `@InjectRepository()` + `TypeOrmModule.forFeature()`.
- ✅ Automatic schema synchronization in development.
- ✅ Rich query builder for aggregations with parameterized queries.
- ❌ TypeORM's `simple-enum` is not a true database enum.
- ❌ TypeORM 1.0 syntax differs from older 0.3.x — some online examples are outdated.
- ❌ No native support for SQLite WAL mode (need manual `PRAGMA` configuration).

---

## ADR-005: Better-sqlite3 Driver Choice

**Status:** Accepted  
**Date:** 2026-06-16  
**Deciders:** Project lead

### Context

SQLite has multiple Node.js driver options. The project needed a TypeORM-compatible driver that performs well for a personal finance workload.

### Decision

Use `better-sqlite3` over the default `sql.js` or `sqlite3` drivers.

### Alternatives Considered

- **`sql.js`** (SQLite compiled to WASM): Runs in pure JavaScript, no native compilation needed. Slower than native, and typeORM compatibility is less mature.
- **`sqlite3`** (the original, callback-based): Asynchronous with callbacks, which causes friction with TypeORM's promise-based repository methods. Requires manual management of the async queue.
- **`better-sqlite3`**: Synchronous API that maps cleanly to TypeORM's internal operations. Native C++ binding provides the best performance. TypeORM has a dedicated `better-sqlite3` driver type.

### Consequences

- ✅ Synchronous calls map perfectly to TypeORM's operation model.
- ✅ Fastest SQLite driver available for Node.js.
- ✅ TypeORM has first-class support via `type: 'better-sqlite3'`.
- ❌ Requires native compilation (`node-gyp`), which can be problematic on some systems (but prebuilt binaries are available for common platforms).
- ❌ Default configuration does not enable WAL mode, which could be a problem for concurrent read/write in production (SQLite limitation, not driver-specific).

---

## ADR-006: Strategy Pattern for Auth (Passport.js)

**Status:** Accepted  
**Date:** 2026-06-16  
**Deciders:** Project lead

### Context

NestJS provides the `@nestjs/passport` integration that wraps Passport.js, the most popular Node.js authentication middleware. The project needed to decide how to structure authentication logic.

### Decision

Use the Strategy pattern via Passport.js with a dedicated `JwtStrategy` class. The guard mechanism is implemented as a `JwtAuthGuard` that extends `AuthGuard('jwt')`.

The architecture separates concerns as follows:

1. **`AuthModule`** (NestJS Module): Wires up JwtModule, PassportModule, and TypeOrmModule for User.
2. **`JwtStrategy`** (Strategy): Extracts the JWT from the Bearer header, validates it with the secret, and calls `validate()` to look up the user in the database.
3. **`JwtAuthGuard`** (Guard): Extends `AuthGuard('jwt')` — applied to controllers with `@UseGuards(JwtAuthGuard)`.
4. **`AuthService`** (Service): Handles register and login logic (password hashing, user creation, token signing).
5. **`AuthController`** (Controller): Exposes `POST /auth/register` and `POST /auth/login` endpoints.

This separation means:
- To add OAuth2 later: add a `GoogleStrategy` extending `PassportStrategy(Strategy)`, register it in the module, and create a guard for it.
- To change token validation logic: modify only `JwtStrategy`.
- To change hashing algorithm: modify only `AuthService.hashPassword()`.

### Alternatives Considered

- **Inline JWT validation in a custom guard**: Would mix token validation with auth logic, making it hard to test or extend.
- **Middleware-based auth**: NestJS middleware runs before guards but doesn't integrate with `@nestjs/passport`'s strategy system. Would need manual error handling and user injection.
- **No passport, manual JWT verification**: Would need to duplicate Passport's well-tested token extraction and validation logic.

### Consequences

- ✅ Battle-tested: Passport.js has decades of community use.
- ✅ Extensible: Adding new auth strategies (Google, GitHub, etc.) is a one-class addition.
- ✅ Clean testability: `JwtStrategy` can be tested in isolation with a mock `UserRepository`.
- ❌ Extra abstraction layer: For a simple JWT-only auth system, Passport adds indirection (Strategy + Guard + Module).
- ❌ `AuthGuard('jwt')` throws 401 Unauthorized automatically — custom error handling requires overriding `handleRequest()`.
