# Database Design

## Overview

The application uses a relational data model with 5 entities. In development the database is SQLite (via `better-sqlite3`), but the schema is designed to be PostgreSQL-compatible for production deployment on Neon.

## Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Account : "has"
    User ||--o{ Category : "has"
    User ||--o{ Transaction : "has"
    User ||--o{ Budget : "has"
    Account ||--o{ Transaction : "references"
    Category ||--o{ Transaction : "categorizes"
    Category ||--o{ Budget : "budgets"

    User {
        int id PK
        string email UK
        string name
        string password
        datetime createdAt
    }

    Account {
        int id PK
        string name
        string type "checking | savings | credit | investment | cash"
        real balance
        string currency "default: USD"
        int userId FK
        datetime createdAt
    }

    Category {
        int id PK
        string name
        string type "income | expense"
        string icon "default: 💰"
        string color "default: #6366f1"
        int userId FK
        datetime createdAt
    }

    Transaction {
        int id PK
        real amount
        string description
        date date
        string type "income | expense"
        int accountId FK
        int categoryId FK
        int userId FK
        datetime createdAt
    }

    Budget {
        int id PK
        int categoryId FK
        int month "1-12"
        int year
        real limit
        real spent "default: 0"
        int userId FK
        datetime createdAt
    }
```

## Entity Descriptions

### User

The `User` entity represents a registered user of the application. Passwords are hashed with SHA-256 before storage. There is no email verification flow — the seeded demo user (`demo@example.com` / `password123`) is created directly.

| Column      | Type       | Constraints      | Notes                          |
|-------------|------------|------------------|--------------------------------|
| `id`        | `INTEGER`  | PK, auto-increment |                                |
| `email`     | `VARCHAR`  | UNIQUE, NOT NULL  | Used for authentication        |
| `name`      | `VARCHAR`  | NOT NULL          | Display name                   |
| `password`  | `VARCHAR`  | NOT NULL          | SHA-256 hex digest              |
| `createdAt` | `DATETIME` | DEFAULT NOW       | Managed by `@CreateDateColumn`  |

### Account

An Account represents a financial account (checking, savings, credit card, investment, or cash). The `balance` column holds the **initial balance** at account creation time. The *current* balance is computed dynamically by adding transaction net amounts to the initial balance.

| Column     | Type       | Constraints      | Notes                                  |
|------------|------------|------------------|----------------------------------------|
| `id`       | `INTEGER`  | PK, auto-increment |                                        |
| `name`     | `VARCHAR`  | NOT NULL          | e.g., "Checking Account"               |
| `type`     | `VARCHAR`  | simple-enum       | One of: `checking`, `savings`, `credit`, `investment`, `cash` |
| `balance`  | `REAL`     | DEFAULT 0         | Opening/initial balance                |
| `currency` | `VARCHAR`  | DEFAULT 'USD'     | ISO 4217 currency code                 |
| `userId`   | `INTEGER`  | FK → User, nullable | NULL for system-level accounts        |
| `createdAt`| `DATETIME` | DEFAULT NOW       |                                        |

The `type` column uses TypeORM's `simple-enum` which stores the enum value as a plain string in SQLite. When migrating to PostgreSQL this should be converted to a proper `ENUM` type or a `VARCHAR` with a `CHECK` constraint.

**Balance computation:** The `AccountsService.computeBalance()` method executes:
```sql
SELECT COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) AS net
FROM transactions t
WHERE t.accountId = :accountId
```
Then adds this net to the account's initial `balance`.

### Category

Categories classify transactions as either `income` or `expense`. Each category has a name, an emoji icon, and a hex color for visual identification in the UI.

| Column     | Type       | Constraints      | Notes                              |
|------------|------------|------------------|------------------------------------|
| `id`       | `INTEGER`  | PK, auto-increment |                                    |
| `name`     | `VARCHAR`  | NOT NULL          | e.g., "Salary", "Food"            |
| `type`     | `VARCHAR`  | simple-enum       | `income` or `expense`              |
| `icon`     | `VARCHAR`  | DEFAULT '💰'      | Emoji character                    |
| `color`    | `VARCHAR`  | DEFAULT '#6366f1' | Hex color code                     |
| `userId`   | `INTEGER`  | FK → User, nullable |                                    |
| `createdAt`| `DATETIME` | DEFAULT NOW       |                                    |

### Transaction

Transactions are the core financial records — each represents a single income or expense entry linked to an account and a category.

| Column       | Type       | Constraints        | Notes                                  |
|--------------|------------|--------------------|----------------------------------------|
| `id`         | `INTEGER`  | PK, auto-increment |                                        |
| `amount`     | `REAL`     | NOT NULL           | Always positive; direction via `type`  |
| `description`| `VARCHAR`  | NOT NULL           | Free-text description                  |
| `date`       | `DATE`     | NOT NULL           | Transaction date (no time component)   |
| `type`       | `VARCHAR`  | simple-enum        | `income` or `expense`                  |
| `accountId`  | `INTEGER`  | FK → Account, NOT NULL | CASCADE on delete                   |
| `categoryId` | `INTEGER`  | FK → Category, NOT NULL | CASCADE on delete                 |
| `userId`     | `INTEGER`  | FK → User, nullable |                                       |
| `createdAt`  | `DATETIME` | DEFAULT NOW         |                                       |

The `type` column controls how the amount affects the account balance: `income` adds, `expense` subtracts. Accounts cannot be deleted if they have associated transactions — the service layer enforces this check before allowing deletion.

### Budget

A Budget sets a spending limit for a specific category in a specific month/year. The `spent` column is a cached value; the actual spent amount is computed in real-time via aggregation queries.

| Column       | Type       | Constraints           | Notes                            |
|--------------|------------|-----------------------|----------------------------------|
| `id`         | `INTEGER`  | PK, auto-increment    |                                  |
| `categoryId` | `INTEGER`  | FK → Category, NOT NULL | CASCADE on delete              |
| `month`      | `INTEGER`  | NOT NULL              | 1-12                             |
| `year`       | `INTEGER`  | NOT NULL              | e.g., 2026                       |
| `limit`      | `REAL`     | NOT NULL              | Budget ceiling                   |
| `spent`      | `REAL`     | DEFAULT 0             | Cached value; actual from query  |
| `userId`     | `INTEGER`  | FK → User, nullable   |                                  |
| `createdAt`  | `DATETIME` | DEFAULT NOW           |                                  |

The `getSummary()` method in `BudgetsService` computes actual spending per budget using:
```sql
SELECT COALESCE(SUM(t.amount), 0) AS total
FROM transactions t
WHERE t.categoryId = :categoryId
  AND strftime('%m', t.date) = :month
  AND strftime('%Y', t.date) = :year
  AND t.type = 'expense'
```

## Migration Strategy

### Development (SQLite)

In development, TypeORM's `synchronize: true` option is enabled when `NODE_ENV=development`:

```typescript
// app.module.ts
TypeOrmModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    type: 'better-sqlite3',
    database: configService.get<string>('DATABASE_PATH', 'data/finance.db'),
    autoLoadEntities: true,
    synchronize: configService.get<string>('NODE_ENV') === 'development',
    logging: configService.get<string>('NODE_ENV') === 'development',
  }),
  inject: [ConfigService],
});
```

This auto-creates tables and columns based on entity decorators. No migration files are needed during active development — schema changes are instant.

### Production / PostgreSQL Migration

When migrating to PostgreSQL (e.g., on Neon), follow these steps:

1. **Replace the driver**: Install `pg` and `@types/pg`, remove `better-sqlite3` and `@types/better-sqlite3`.

2. **Update `app.module.ts`**:
   ```typescript
   TypeOrmModule.forRootAsync({
     useFactory: (configService: ConfigService) => ({
       type: 'postgres',
       host: configService.get<string>('DB_HOST'),
       port: configService.get<number>('DB_PORT', 5432),
       username: configService.get<string>('DB_USERNAME'),
       password: configService.get<string>('DB_PASSWORD'),
       database: configService.get<string>('DB_DATABASE'),
       ssl: { rejectUnauthorized: false }, // Required for Neon
       autoLoadEntities: true,
       synchronize: false, // Use migrations for production
       migrations: ['dist/migrations/*.js'],
     }),
   });
   ```

3. **Generate initial migration**:
   ```bash
   npx typeorm-ts-node-commonjs migration:generate -d src/migrations/InitialSchema
   ```

4. **Review and adjust**: SQLite's `simple-enum` becomes `VARCHAR` with a CHECK constraint in Postgres. The `strftime()` SQLite functions used in dashboard and budget queries must be replaced with PostgreSQL `EXTRACT()` or `TO_CHAR()`.

### Compatibility Notes

| SQLite Pattern              | PostgreSQL Equivalent                   |
|-----------------------------|-----------------------------------------|
| `strftime('%m', t.date)`    | `EXTRACT(MONTH FROM t.date)` or `TO_CHAR(t.date, 'MM')` |
| `'real'` column type        | `double precision` or `numeric`         |
| `simple-enum`               | `VARCHAR` + `CHECK(... IN (...))` or native `ENUM` |
| `autoincrement`             | `SERIAL` or `IDENTITY`                  |

## Connecting to Neon (PostgreSQL)

When deploying to Neon, you'll need these environment variables:

```env
# Database
DB_HOST=ep-xxxx.us-east-2.aws.neon.tech
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=neondb

# Explicit PostgreSQL config (alternative to individual vars)
DATABASE_URL=postgresql://your_db_user:your_db_password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Always required for Neon
NODE_ENV=production
JWT_SECRET=your-production-secret
```

Neon requires SSL connections. The `ssl: { rejectUnauthorized: false }` option in TypeORM config handles this. For production, set `rejectUnauthorized: true` and provide a CA certificate.

## TypeORM Configuration Details

Key TypeORM configuration points:

- **`autoLoadEntities: true`** — Automatically loads entities registered via `TypeOrmModule.forFeature()` in each module. No need to list them all in the root `TypeOrmModule.forRoot()`.
- **`synchronize: true`** (dev only) — Auto-creates database schema on every application boot. Never use this in production.
- **Entity decorators**: `@Entity('table_name')` explicitly sets table names in lowercase plural. `@PrimaryGeneratedColumn()` uses auto-increment integers. `@Column({ type: 'real' })` maps to SQLite REAL (float). `@Column({ type: 'date' })` maps to SQLite's date text format.
- **Relations**: All foreign keys use `@ManyToOne()` with `{ onDelete: 'CASCADE' }` for referential integrity. The `@JoinColumn({ name: 'fieldName' })` decorator explicitly names the FK column.
- **Repository injection**: Each service injects repositories via `@InjectRepository(EntityName)`. TypeORM module setup in the feature module (e.g., `TypeOrmModule.forFeature([User])`) registers the repository for DI.
