# Frontend Architecture

## Overview

The frontend is an Angular 22 application using **standalone components**, **signals** for reactivity, **zoneless change detection**, and **Tailwind CSS** for styling. All pages are lazy-loaded, producing 7 separate JavaScript chunks for optimal loading performance.

**Tech stack:** Angular 22.0.0, TypeScript 6.0, Tailwind CSS 3.4.19, RxJS 7.8

**Build system:** Angular CLI 22 via `@angular/build:application` builder (Vite-based).

---

## Signal Architecture: Which State Lives Where

The application uses **signals** (`signal()` and `computed()`) for all component-level state. There is no global state management library — each component is self-contained.

### State Categories

| Category           | Where                           | How Updated                       | Example                                |
|--------------------|----------------------------------|-----------------------------------|----------------------------------------|
| **Data**           | Component `signal<T>()`         | `data.set(response)`              | `transactions = signal<Transaction[]>([])` |
| **Loading**        | Component `signal<boolean>()`   | `loading.set(true/false)`         | `loading = signal(true)`                |
| **Error**          | Component `signal<string|null>()`| `error.set('message')`            | `error = signal<string | null>(null)`   |
| **UI Mode**        | Component `signal<string>()`    | `mode.set('form')`                | `mode = signal<'list' | 'form'>('list')`|
| **Form State**     | Component class fields          | `[(ngModel)]` binding             | `formAmount = 0`, `formDescription = ''`|
| **Derived/Computed**| `computed()`                   | Auto-recalculates                 | `netAmount = computed(() => totalIncome() - totalExpenses())` |
| **Auth Token**     | `localStorage`                  | `localStorage.setItem('token')`   | Read via `AuthService.getToken()`       |

### Pattern: Loading / Error / Data Triad

Every data-fetching component follows the same pattern:

```typescript
data = signal<DataType | null>(null);
loading = signal(true);
error = signal<string | null>(null);

loadData(): void {
  this.loading.set(true);
  this.error.set(null);
  this.api.getData().subscribe({
    next: (res) => { this.data.set(res); this.loading.set(false); },
    error: (err) => { this.error.set(err.message); this.loading.set(false); },
  });
}
```

Template structure:

```html
@if (loading()) {
  <loading-skeleton />
} @else if (error()) {
  <error-state [message]="error()" (retry)="loadData()" />
} @else if (data()) {
  @let d = data()!;
  <content [data]="d" />
} @else {
  <empty-state />
}
```

### Reports: Computed Signals Example

The Reports component (`ReportsComponent`) demonstrates the full power of signals for client-side computation. It fetches all transactions for the current month once, then derives 5 computed values from that single signal:

```typescript
allTransactions = signal<Transaction[]>([]);

// Derived: total income
totalIncome = computed(() =>
  this.allTransactions()
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
);

// Derived: total expenses
totalExpenses = computed(() =>
  this.allTransactions()
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
);

// Derived: net
netAmount = computed(() => this.totalIncome() - this.totalExpenses());

// Derived: percentages for visual bars
incomePercent = computed(() =>
  Math.round((this.totalIncome() / Math.max(this.totalIncome(), this.totalExpenses(), 1)) * 100)
);

// Derived: category breakdown
categoryTotals = computed<CategoryAggregate[]>(() => { /* aggregation logic */ });
```

All five computed values update automatically when `allTransactions` changes, no manual wiring needed. This pattern avoids multiple API calls for different report views.

---

## Component Tree

```
App (app.ts)  ← standalone, imports RouterOutlet + RouterLink
├── NavBar (inline in app.ts)
│   ├── Dashboard link
│   ├── Transactions link
│   ├── Budgets link
│   └── Reports link
└── <router-outlet>
    ├── LoginComponent (lazy)       ← /login
    ├── DashboardComponent (lazy)   ← /dashboard
    ├── TransactionsComponent (lazy)← /transactions
    ├── BudgetsComponent (lazy)     ← /budgets
    └── ReportsComponent (lazy)     ← /reports
```

All components are **standalone** — no `NgModule` wrappers. Each component uses `imports: [...]` to declare its dependencies.

**Services** (provided in root via `providedIn: 'root'`):

```
ApiService       ← HTTP calls to all backend endpoints
AuthService      ← Login, register, logout, token management
authGuard (fn)   ← Route guard, checks localStorage for token
```

### Component Dependencies

| Component              | Imports                                              |
|------------------------|------------------------------------------------------|
| `LoginComponent`       | `FormsModule`                                        |
| `DashboardComponent`   | `CurrencyPipe`, `DatePipe`                           |
| `TransactionsComponent`| `DatePipe`, `CurrencyPipe`, `FormsModule`            |
| `BudgetsComponent`     | `CurrencyPipe`, `FormsModule`                        |
| `ReportsComponent`     | `CurrencyPipe`                                       |

---

## Lazy Loading Strategy

Routes use Angular's `loadComponent` syntax to lazy-load each page as a separate chunk:

```typescript
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
  },
  // ... same for dashboard, transactions, budgets, reports
];
```

**7 chunks produced by the build:**

| Chunk               | Size (approx) | Content                                |
|---------------------|----------------|----------------------------------------|
| `main-*.js`         | ~15 KB         | App shell, router, services             |
| `chunk-login-*.js`  | ~8 KB          | Login/register component                |
| `chunk-dash-*.js`   | ~12 KB         | Dashboard component                     |
| `chunk-tx-*.js`     | ~18 KB         | Transactions component (largest, has form + filters) |
| `chunk-budget-*.js` | ~14 KB         | Budgets component                       |
| `chunk-report-*.js` | ~14 KB         | Reports component                       |
| `styles-*.css`      | ~4 KB          | Tailwind-generated styles               |

The entry point (`main.ts`) bootstraps the standalone `App` component with `bootstrapApplication(App, appConfig)`.

**Route guards:** `authGuard` is applied to all routes except `/login`. If no token exists in `localStorage`, the guard redirects to `/login`.

---

## Zoneless Change Detection

The application uses Angular 22's **zoneless change detection** via the `provideZonelessChangeDetection()` provider:

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
  ],
};
```

### How It Works

Traditional Angular uses Zone.js to monkey-patch browser APIs (setTimeout, addEventListener, XHR, etc.) and trigger change detection when any patched API fires. Zoneless change detection removes Zone.js entirely and relies on signals to know when the application state has changed.

### What Triggers Updates

1. **Signal writes**: When `signal.set()` or `signal.update()` is called, Angular marks the component as dirty and schedules a re-render.
2. **Async operations**: `HttpClient` Observables, `setTimeout`, `Promise.then`, and `addEventListener` still work — but instead of Zone.js intercepting them, Angular tracks rendering at the microtask level.
3. **User events**: Click handlers, input events, form submissions — Angular's event system triggers change detection for the affected component tree.

### What This Means for Development

- **No `NgZone` service needed**: No `this.ngZone.runOutsideAngular()` or `this.ngZone.run()` calls.
- **Performance**: Change detection is limited to components whose signals actually changed. The `DashboardComponent` updating `loading.set(false)` doesn't cause the `TransactionsComponent` to re-check.
- **CDN/third-party scripts**: Without Zone.js, third-party code (Google Analytics, Stripe, etc.) cannot accidentally trigger change detection.
- **`ChangeDetectionStrategy.OnPush` is irrelevant**: In zoneless mode, `OnPush` is the only strategy available — components only render when their signals or inputs change.

### Future-Proofing

Zoneless change detection is the direction Angular is heading. Angular 18 introduced experimental zoneless support, and Angular 22 has it production-ready. By adopting it now, this project avoids a future migration path.

---

## Loading / Empty / Error Pattern

All pages follow a consistent tri-state pattern in their templates:

### Dashboard (DashboardComponent)

```html
@if (loading()) {
  <!-- Animated pulse skeleton grid -->
} @else if (error()) {
  <!-- Red warning icon + error message + Retry button -->
} @else if (data()) {
  @let d = data()!;
  <!-- Stat cards, recent transactions table, budget status -->
}
```

### Transactions (TransactionsComponent)

Switches between two modes (`'list'` and `'form'`) using `@switch`. Within list mode, it shows:

```html
@if (loading()) {
  <!-- 5 skeleton rows -->
} @else if (error()) {
  <!-- Error with retry -->
} @else if (transactions().length === 0) {
  <!-- Empty state: 📋 icon + "No transactions found" -->
} @else {
  <!-- Data table -->
}
```

### Budgets (BudgetsComponent)

```html
@if (loading()) {
  <!-- 3 card skeletons -->
} @else if (error()) {
  <!-- Error with retry -->
} @else if (budgets().length === 0) {
  <!-- Empty state: 💰 icon + "No budgets set" -->
} @else {
  <!-- Budget cards grid -->
}
```

### Reports (ReportsComponent)

```html
@if (loading()) {
  <!-- 3 section skeletons -->
} @else if (error()) {
  <!-- Error with retry -->
} @else if (allTransactions().length === 0) {
  <!-- Empty state: 📊 icon + "No data for this month" -->
} @else {
  <!-- Income vs expenses bar, category breakdown table, monthly summary -->
}
```

### Login (LoginComponent)

No loading/empty/error pattern for data — it tracks `loading` and `error` for the form submission:

```html
@if (error()) {
  <!-- Red alert banner -->
}
<button [disabled]="loading()">
  @if (loading()) { <spinner /> }
  Sign In / Create Account
</button>
```

---

## Tailwind Design System Notes

### Configuration

Tailwind CSS 3.4.19 is configured via the standard PostCSS setup. The `@tailwind` directives are in `styles.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

The Angular build pipeline processes Tailwind through PostCSS automatically via `@angular/build:application`.

### Design Tokens (Conventions)

The project follows these design conventions, enforced through Tailwind utility classes:

| Token              | Value                   | Usage                                  |
|--------------------|-------------------------|----------------------------------------|
| Primary color      | `blue-600` / `blue-700` | Buttons, links                         |
| Background         | `white`                 | Cards, tables                          |
| Surface            | `gray-50`               | Table headers, subtle backgrounds      |
| Text primary       | `gray-800`              | Headings                               |
| Text secondary     | `gray-600` / `gray-500` | Body text, labels                      |
| Text muted         | `gray-400`              | Hints, empty states                    |
| Income color       | `green-600` / `green-500` | Income amounts, progress bars        |
| Expense color      | `red-600` / `red-500`   | Expense amounts, progress bars         |
| Warning            | `yellow-500`            | Budget near-limit (80-100%)            |
| Border             | `gray-100` / `gray-300` | Card borders, input borders            |
| Border focus       | `blue-500`              | Input focus ring                       |
| Border radius      | `rounded-lg` (8px), `rounded-xl` (12px), `rounded-2xl` (16px) | Cards, inputs, modals |
| Shadow             | `shadow-sm`             | Card elevation                         |
| Spacing            | Tailwind's 4px base     | `p-4` = 16px, `gap-4` = 16px, etc.    |

### Component-Specific Patterns

**Cards:** `bg-white rounded-xl shadow-sm border border-gray-100 p-6`

**Buttons:**
- Primary: `bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition`
- Secondary: `px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg`
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`

**Form inputs:** `w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm`

**Tables:** Standard `w-full text-left` with `bg-gray-50` header row, `border-b border-gray-100` rows, and `hover:bg-gray-50` row hover.

**Progress bars:** `bg-gray-200 rounded-full h-2.5` track with colored fill `h-2.5 rounded-full` using dynamic width and color classes (`bg-green-500`, `bg-yellow-500`, `bg-red-500`).

**Loading skeletons:** `animate-pulse` with `bg-gray-200 rounded-xl h-28` (and similar) to mimic the content layout.

**Empty states:** Centered text with a large emoji icon (4xl-5xl) and two lines of text — a title in `text-gray-500` and a hint in `text-gray-400 text-sm`.

### Responsive Breakpoints

The app uses Tailwind's default breakpoints:

| Breakpoint | Min Width | Usage                               |
|------------|-----------|-------------------------------------|
| `sm`       | 640px     | —                                    |
| `md`       | 768px     | Multi-column grids (forms, cards)    |
| `lg`       | 1024px    | 3-column budget grid                 |
| `xl`       | 1280px    | —                                    |

Common responsive patterns:
- Stat cards: `grid grid-cols-1 md:grid-cols-4 gap-4`
- Budget cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Form rows: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Filter bar: `grid grid-cols-1 md:grid-cols-4 gap-3`
