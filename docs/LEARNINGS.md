# Learnings & Patterns

This document captures the technical insights, patterns, and solutions discovered while building the Personal Finance Dashboard. Each entry describes a specific challenge and how it was solved.

---

## 1. Aggregation Queries in TypeORM for Budget Summaries

**Context:** The budget summary endpoint needs to compute how much has been spent per budget category in the current month. The naive approach — loading all transactions and filtering in-memory — doesn't scale. We wanted the database to do the aggregation.

**Solution:** Use TypeORM's `QueryBuilder` with `COALESCE` and `SUM` to compute the actual spending for each budget category:

```typescript
async getSummary(userId?: number): Promise<any[]> {
  const budgets = await this.budgetRepository.find({
    where: { month: currentMonth, year: currentYear, ...(userId ? { userId } : {}) },
    relations: { category: true },
  });

  const summary = await Promise.all(
    budgets.map(async (budget) => {
      const actualResult = await this.transactionRepository
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'total')
        .where('t.categoryId = :categoryId', { categoryId: budget.categoryId })
        .andWhere("strftime('%m', t.date) = :month", { month: paddedMonth })
        .andWhere("strftime('%Y', t.date) = :year", { year: String(currentYear) })
        .andWhere("t.type = 'expense'")
        .getRawOne();

      const actual = Number(actualResult?.total) || 0;
      return {
        ...budget,
        actual,
        remaining: budget.limit - actual,
        percentage: budget.limit > 0 ? Math.round((actual / budget.limit) * 100) : 0,
      };
    }),
  );

  return summary;
}
```

**Key insights:**
- `COALESCE(SUM(...), 0)` prevents `NULL` results when there are no matching transactions.
- `strftime('%m', t.date)` extracts the month from SQLite's date strings. In PostgreSQL, this would be `EXTRACT(MONTH FROM t.date)`.
- Running one query per budget with `Promise.all()` is acceptable for small numbers of budgets (typically 4–10 per user). For very large numbers, a single GROUP BY query would be more efficient.
- The `percentage` calculation must handle `limit = 0` to avoid division by zero.

**Lesson:** TypeORM QueryBuilder is powerful for aggregation but requires careful parameterization. Always use `.setParameter()` or the object syntax in `.where()` to prevent SQL injection.

---

## 2. Date-Range Filtering with Between Operator

**Context:** The transactions list page needs to filter by date range (start date to end date). The frontend sends optional `startDate` and `endDate` query parameters.

**Solution:** Use TypeORM's `Between` operator to construct date range conditions dynamically:

```typescript
async findAll(query: QueryTransactionDto, userId?: number): Promise<Transaction[]> {
  const where: any = {};

  if (userId) where.userId = userId;
  if (query.accountId) where.accountId = query.accountId;
  if (query.categoryId) where.categoryId = query.categoryId;

  if (query.startDate && query.endDate) {
    where.date = Between(new Date(query.startDate), new Date(query.endDate));
  } else if (query.startDate) {
    where.date = Between(new Date(query.startDate), new Date('9999-12-31'));
  } else if (query.endDate) {
    where.date = Between(new Date('1970-01-01'), new Date(query.endDate));
  }

  return this.transactionRepository.find({
    where,
    relations: { account: true, category: true },
    order: { date: 'DESC' },
  });
}
```

**Key insights:**
- `Between(from, to)` generates SQL `WHERE t.date BETWEEN ? AND ?` with inclusive bounds.
- When only one date is provided, the other is set to an extreme value (`1970-01-01` or `9999-12-31`) to create an open-ended range.
- The `where` object is built conditionally — only non-null query parameters are included. TypeORM ignores empty `where` objects.
- The `QueryTransactionDto` uses `@IsOptional()` for all fields, so partial query parameter sets don't trigger validation errors.
- In SQLite, `@Column({ type: 'date' })` stores dates as text strings in `YYYY-MM-DD` format. TypeORM handles the `Date` ↔ string conversion automatically.

**Lesson:** The `Between` operator is a clean way to build date range queries without raw SQL. But be careful: `Between` is inclusive on both ends, which is what we want for date filters (`2026-06-01` through `2026-06-30` includes both endpoints).

---

## 3. Signal-Based Dashboard with Computed Values

**Context:** The dashboard page shows summary data from the API (total balance, monthly income/expenses, recent transactions, budget status). It also computes a `netChange` value client-side as `monthlyIncome - monthlyExpenses`.

**Solution:** Use a `computed()` function derived from the dashboard data signal:

```typescript
data = signal<DashboardSummary | null>(null);
loading = signal(true);
error = signal<string | null>(null);

netChange = () => (this.data()?.monthlyIncome ?? 0) - (this.data()?.monthlyExpenses ?? 0);
```

In the template:

```html
<p>{{ netChange() >= 0 ? '+' : '' }}{{ netChange() | currency }}</p>
```

**Key insights:**
- The `netChange` is defined as a function, not a `computed()`, because it's a simple synchronous calculation. Either approach works — a function is slightly lighter. However, `computed()` would be the better choice if the calculation were expensive or used in multiple places, because it memoizes the result.
- The `@let d = data()!` syntax in the template creates a local variable for the non-null data, avoiding repetitive `data()?.property` syntax.
- The color of the net change value is toggled with `[class.text-green-600]="netChange() >= 0"` — a clean pattern for conditional styling.

**Lesson:** Signals make client-side derived values trivial. Instead of computing `netChange` on the backend and sending it in the API response, we compute it on the client for zero latency. This pattern works for any value that can be derived from existing data — percentage calculations, filtered lists, running totals.

---

## 4. Client-Side Report Computation Pattern

**Context:** The Reports page shows monthly income/expense comparison, category breakdown, and summary stats. Rather than creating multiple API endpoints for different report views, all computation happens client-side on a single data fetch.

**Solution:** Fetch all transactions for the current month once, then derive everything from that single signal:

```typescript
allTransactions = signal<Transaction[]>([]);

totalIncome = computed(() =>
  this.allTransactions()
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
);

totalExpenses = computed(() =>
  this.allTransactions()
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
);

categoryTotals = computed<CategoryAggregate[]>(() => {
  const map = new Map<string, CategoryAggregate>();
  for (const tx of this.allTransactions()) {
    const key = tx.category.name;
    const existing = map.get(key);
    if (existing) {
      existing.total += tx.amount;
    } else {
      map.set(key, { name: key, icon: tx.category.icon, total: tx.amount, type: tx.type });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
});
```

**Key insights:**
- One API call (`GET /api/v1/transactions?startDate=...&endDate=...`) provides all the data needed for three report sections.
- `computed()` signals are lazy and memoized — they only recalculate when `allTransactions()` changes.
- The `categoryTotals` computed signal uses a `Map` for efficient aggregation (O(n) instead of O(n²) with nested filters).
- The monthly date range is computed in `ngOnInit`: `startDate` is the first of the month, `endDate` is the last day.
- The empty state checks `allTransactions().length === 0` — if no transactions exist for the month, a single message is shown instead of three empty sections.

**Lesson:** For small to medium datasets (a few hundred transactions per month), client-side computation is faster and simpler than server-side aggregation. The pattern of "fetch once, compute many" reduces API surface and server load. However, for larger datasets or mobile clients, server-side aggregation would be necessary.

---

## 5. Using tsconfig 'types' for Jest Compatibility

**Context:** When setting up Jest with TypeScript, the test files need access to Jest's global types (`describe`, `it`, `expect`, `jest.fn()`, etc.). Without proper configuration, TypeScript would report errors like `Cannot find name 'describe'`.

**Solution:** Add `"jest"` to the `types` array in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["node", "jest"]
  }
}
```

This tells TypeScript to include type definitions from the `@types/jest` package globally, making `describe`, `it`, `expect`, `jest`, `beforeEach`, etc. available without explicit imports.

**Key insights:**
- Without `"jest"` in `types`, every test file would need `import { describe, it, expect, jest } from '@jest/globals'` or similar.
- The `types` field controls which `@types/*` packages are auto-included. Setting it to `["node", "jest"]` replaces the default `["node"]`, so both Node.js types and Jest types are available.
- The `tsconfig.build.json` extends the base `tsconfig.json` but includes only `src/**/*` — test files are excluded from the build output but still type-checked when running tests.
- The Jest config (`jest.config.json`) uses `ts-jest` with the `tsconfig` pointing to `tsconfig.json`, ensuring test files are compiled with the same settings.

**Lesson:** Configuring `"types": ["node", "jest"]` is the cleanest way to make Jest globals available in TypeScript. An alternative is creating a `src/setup.ts` file with `import '@jest/globals'`, but that adds an extra file and import.

---

## 6. PostgreSQL-Compatible SQL Migration Patterns

**Context:** The application uses SQLite in development but is designed to be deployable to PostgreSQL (Neon) in production. Several SQL patterns required attention to ensure compatibility.

### Pattern 1: Query Building for Date Extraction

SQLite uses `strftime()` for date component extraction, while PostgreSQL uses `EXTRACT()` or `TO_CHAR()`.

**SQLite (current):**
```typescript
.andWhere("strftime('%m', t.date) = :month", { month: paddedMonth })
.andWhere("strftime('%Y', t.date) = :year", { year: String(currentYear) })
```

**PostgreSQL version:**
```typescript
.andWhere('EXTRACT(MONTH FROM t.date) = :month', { month: currentMonth })
.andWhere('EXTRACT(YEAR FROM t.date) = :year', { year: currentYear })
```

**Strategy:** Keep SQLite syntax in development and document all locations where this swap is needed. A find for `strftime` in the codebase identifies all affected files:
- `DashboardService.getSummary()` (2 occurrences)
- `BudgetsService.getSummary()` (2 occurrences)

### Pattern 2: Enum Columns

SQLite doesn't support native enums. TypeORM's `simple-enum` stores enum values as plain strings:

```typescript
@Column({
  type: 'simple-enum',
  enum: ['checking', 'savings', 'credit', 'investment', 'cash'] as AccountType[],
})
type: AccountType;
```

For PostgreSQL, this should be converted to:

```typescript
@Column({
  type: 'enum',
  enum: ['checking', 'savings', 'credit', 'investment', 'cash'],
})
type: AccountType;
```

Or, for maximum portability, use a `VARCHAR` with a `CHECK` constraint managed via migration.

### Pattern 3: Numeric Types

| SQLite Type | PostgreSQL Type | Notes                              |
|-------------|-----------------|------------------------------------|
| `real`      | `double precision` or `numeric` | `real` is fine for currency with rounding; `numeric` is exact. |
| `int`       | `integer`       | Direct mapping                     |
| `date`      | `date`          | Both store ISO 8601 dates          |

### Pattern 4: Auto-Increment

SQLite uses `@PrimaryGeneratedColumn()` which maps to `INTEGER PRIMARY KEY AUTOINCREMENT`. In PostgreSQL, this maps to `SERIAL` or `IDENTITY`:

```typescript
@PrimaryGeneratedColumn()
id: number;
```

TypeORM abstracts this — the decorator works identically in both databases. The generated SQL differs, but the behavior is the same.

### Pattern 5: Migration Strategy

```typescript
// Dev: auto-sync (no migration files)
TypeOrmModule.forRootAsync({
  useFactory: () => ({
    synchronize: process.env.NODE_ENV === 'development',
    // ...
  }),
});

// Production: explicit migrations
// 1. Generate: npx typeorm migration:generate -d src/migrations/MigrationName
// 2. Run:      npx typeorm migration:run
// 3. Revert:   npx typeorm migration:revert
```

**Lesson:** The key to PostgreSQL compatibility is avoiding SQLite-specific features in business logic. Use TypeORM abstractions (QueryBuilder, repository methods) instead of raw SQL wherever possible. When raw SQL is unavoidable (aggregation functions), isolate it in service methods that are easy to find and update during migration.
