# System Architecture

## High-Level Overview

The Personal Finance Dashboard follows a modern two-tier architecture: an Angular 22 single-page application (SPA) communicates with a NestJS 11 REST API over HTTP, which in turn persists data to a SQLite database (PostgreSQL-ready). Authentication is handled via stateless JWT tokens.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Angular 22 SPA)                     │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │  Login Page   │  │  Dashboard   │  │ Transactions │  │ Budgets │ │
│  │  (lazy)       │  │  (lazy)      │  │  (lazy)      │  │ (lazy)  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬────┘ │
│         └─────────────────┴─────────────────┴───────────────┘      │
│                                    │                                │
│                           ┌────────┴────────┐                      │
│                           │   ApiService     │                      │
│                           │  (HTTP + JWT)    │                      │
│                           └────────┬────────┘                      │
│                                    │                                │
│                           JWT Bearer Token                          │
└───────────────────────────┬─────────────────────────────────────────┘
                            │  HTTP Requests (JSON)
                            │
┌───────────────────────────┴─────────────────────────────────────────┐
│                      NestJS 11 API Server                           │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Auth     │  │ Accounts │  │ Categories   │  │ Transactions  │  │
│  │ Module   │  │ Module   │  │ Module       │  │ Module        │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └───────┬───────┘  │
│       │              │               │                  │          │
│  ┌────┴─────┐  ┌─────┴─────┐  ┌─────┴───────┐  ┌──────┴───────┐  │
│  │ Budgets  │  │ Dashboard │  │ Seed        │  │ JwtAuthGuard │  │
│  │ Module   │  │ Module    │  │ Module      │  │ (global)     │  │
│  └────┬─────┘  └────┬─────┘  └─────┬───────┘  └──────────────┘  │
│       │              │              │                             │
│       └──────────────┴──────────────┘                             │
│                            │                                      │
│                    ┌───────┴────────┐                             │
│                    │  TypeORM       │                             │
│                    │  (Repository   │                             │
│                    │   Pattern)     │                             │
│                    └───────┬────────┘                             │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │   SQLite DB     │
                    │  (better-sqlite3)│
                    │ data/finance.db │
                    └─────────────────┘
```

## Component / Module Structure

### Backend Modules (`apps/api/src/`)

| Module       | Controller Path       | Purpose                                              |
|--------------|-----------------------|------------------------------------------------------|
| `AuthModule` | `POST /auth/*`        | Register and login, JWT issuance                     |
| `AccountsModule` | `/api/v1/accounts/*` | CRUD for financial accounts (checking, savings, etc.) |
| `CategoriesModule` | `/api/v1/categories/*` | CRUD for income/expense categories                  |
| `TransactionsModule` | `/api/v1/transactions/*` | CRUD with date-range and relation filtering       |
| `BudgetsModule` | `/api/v1/budgets/*`   | Budget CRUD + aggregated budget-vs-actual summaries  |
| `DashboardModule` | `/api/v1/dashboard/*` | Aggregated dashboard data (totals, recent tx, budget status) |
| `SeedModule`  | `POST /api/v1/seed`    | Demo data seeding (idempotent)                       |

All modules except `Auth` and `Seed` are guarded by `JwtAuthGuard`. The URI versioning prefix `/api/v1` is applied globally via NestJS URI versioning.

### Frontend Pages (`apps/web/src/app/`)

| Route          | Component              | Lazy? | Guard?    | Purpose                             |
|----------------|------------------------|-------|-----------|-------------------------------------|
| `/login`       | `LoginComponent`       | Yes   | No        | Login/register form                 |
| `/dashboard`   | `DashboardComponent`   | Yes   | `authGuard` | Overview with stats, recent tx, budgets |
| `/transactions`| `TransactionsComponent`| Yes   | `authGuard` | Transaction list with filters + add form |
| `/budgets`     | `BudgetsComponent`     | Yes   | `authGuard` | Budget cards with progress bars     |
| `/reports`     | `ReportsComponent`     | Yes   | `authGuard` | Monthly income/expense reports      |
| `/`            | *(redirect)*           | —     | —        | Redirects to `/dashboard`           |

Each page is lazy-loaded via Angular's `loadComponent` syntax, producing 7 chunks total (5 pages + the app shell + shared/vendor chunks).

## Data Flow: How a Transaction Gets from UI to DB and Back

### Creating a Transaction (Write Path)

1. **User fills the form** on the Transactions page. The form binds to local signals (`formAmount`, `formDescription`, etc.) using `[(ngModel)]`.

2. **User clicks "Save Transaction"** → `addTransaction()` fires in `TransactionsComponent`.

3. **Component calls `ApiService.createTransaction()`**, which builds a POST request with `Authorization: Bearer <token>` header and the transaction payload as JSON:
   ```json
   { "amount": 150.00, "description": "Grocery shopping", "date": "2026-06-16", "type": "expense", "accountId": 1, "categoryId": 3 }
   ```

4. **HTTP request hits NestJS** at `POST /api/v1/transactions`. The `ValidationPipe` (global) validates the body against `CreateTransactionDto` — checks types, enums, and required fields. If validation fails, a 400 error is returned immediately.

5. **`JwtAuthGuard` intercepts** the request, extracts the JWT from the Authorization header, validates it via `JwtStrategy.validate()`, and attaches the `User` object to `req.user`.

6. **`TransactionsController.create()`** receives the validated DTO and `req.user.id`, and delegates to `TransactionsService.create()`.

7. **`TransactionsService.create()`** calls `this.transactionRepository.create(dto)` to instantiate a `Transaction` entity, then `this.transactionRepository.save()` to persist it. TypeORM generates the `INSERT` SQL automatically:
   ```sql
   INSERT INTO "transactions" ("amount", "description", "date", "type", "accountId", "categoryId", "userId", "createdAt")
   VALUES (150, 'Grocery shopping', '2026-06-16', 'expense', 1, 3, 1, '2026-06-16T12:00:00.000Z');
   ```

8. **The saved entity is returned** up the call stack, serialized to JSON by NestJS class-serializer, and sent back as the HTTP response with status 201.

9. **`ApiService` receives the response**, the Observable subscription in `TransactionsComponent.addTransaction()` fires, resets the form, calls `loadTransactions()` to refresh the list, and the UI updates reactively because `transactions.set()` triggers Angular's change detection.

### Reading Transactions (Read Path)

1. **Component initializes** → `ngOnInit()` calls `loadTransactions()`.

2. **`ApiService.getTransactions()`** builds a GET request with query parameters (accountId, categoryId, startDate, endDate if set).

3. **Backend processes** the query through the same guard/validation chain. `TransactionsService.findAll()` builds a TypeORM `where` clause dynamically using the `QueryTransactionDto` fields.

4. **TypeORM executes** the SELECT query with the appropriate filters and JOINs on `account` and `category` relations.

5. **Results are returned** as a JSON array of transactions with nested account and category objects.

6. **`ApiService` emits the array**, the component calls `this.transactions.set(res)`, and Angular updates the template. Loading skeletons are replaced by the data table.

## Why This Architecture?

### Why NestJS Modules?

NestJS modules provide clear **separation of concerns** and **dependency injection scoping**. Each module owns its domain:

- **Controllers** handle HTTP concerns (routing, request/response).
- **Services** contain business logic and are testable in isolation.
- **Modules** wire everything together and import only the dependencies they need (e.g., `TypeOrmModule.forFeature([User])`).

This makes the codebase navigable: if you need to change account validation rules, you go to `AccountsService`. If you need to add an endpoint, you go to the controller's file. Module boundaries also make it easy to extract microservices later — each NestJS module can become its own service.

### Why Angular Signals over RxJS for State?

Angular 22's **signals** (`signal()`, `computed()`) provide fine-grained reactivity without Zone.js. Benefits:

- **Performance**: Signals track dependencies at the component level, so updating `loading.set(false)` doesn't trigger change detection across the entire app — only the components that read that signal.
- **Simplicity**: No `.pipe()`, no `map()`, no `subscribe()` gymnastics for local UI state. A loading flag is just `loading = signal(true)` and `loading.set(false)`.
- **Predictability**: Signals are synchronous and deterministic. When you call `data.set(newValue)`, any `computed()` or template referencing `data()` recalculates immediately. No microtask queue, no async pipe ambiguity.
- **Zoneless compatibility**: Signals are the backbone of Angular's zoneless change detection. Since this project uses `provideZonelessChangeDetection()`, signals ensure the UI stays in sync without Zone.js patching DOM events.
- **Template ergonomics**: `@if (loading())` and `@for (item of items())` in Angular control flow syntax reads naturally and avoids the `async` pipe.

### Why SQLite for Dev + PostgreSQL-Ready?

SQLite via `better-sqlite3` gives zero-config local development — no Docker, no Postgres install. But all entities and queries are written with PostgreSQL compatibility in mind: standard SQL data types (`real`, `int`, `date`), no SQLite-specific extensions in business logic, and the TypeORM abstraction layer means switching the driver from `better-sqlite3` to `pg` is a one-line config change.

### Why JWT over Session-Based Auth?

JWT tokens are stateless — no server-side session store needed. This simplifies horizontal scaling: any API instance can validate a token without shared Redis/memcached. The token carries the user identity (`sub`, `email`) and expiration, making it self-contained. For a personal finance app with a handful of users, this is the pragmatic choice over session-based auth.

### Why TypeORM over Raw SQL / Prisma?

TypeORM's repository pattern and decorator-based entities provide a familiar ActiveRecord-like experience for NestJS developers. It integrates deeply with NestJS (the `@nestjs/typeorm` package provides `@InjectRepository()` for clean DI). Using raw SQL would lose type safety and composability. Prisma, while excellent, introduces a separate schema file and generation step that adds complexity for a project of this size. TypeORM with `synchronize: true` in dev gives instant schema evolution without migration files for rapid prototyping.
