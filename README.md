# Hermes Finance Dashboard 💰

Track your personal finances with ease — manage accounts, transactions, categories, and budgets in a clean, modern dashboard.

## Features

- **Dashboard Overview** — See your total balance, monthly income/expenses, recent transactions, and budget status at a glance
- **Transaction Management** — Add, filter, and manage income and expense transactions with date range, category, and account filters
- **Budget Tracking** — Set monthly spending limits per category with visual progress bars (green/yellow/red thresholds)
- **Account Management** — Track multiple accounts (checking, savings, credit card, investment, cash)
- **Category Organization** — Income and expense categories with custom icons and colors
- **Financial Reports** — Income vs expense comparison, category breakdown, monthly summaries
- **JWT Authentication** — Secure register/login flow with protected routes
- **Responsive Design** — Tailwind CSS, works on desktop and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 22 (standalone, signals, zoneless CD, Tailwind CSS) |
| Backend | NestJS 11 (TypeScript, strict mode, Swagger docs) |
| Database | SQLite via better-sqlite3 (dev) / PostgreSQL-ready migrations |
| Auth | JWT with Passport.js + SHA-256 password hashing |
| API Docs | Swagger at `/api/docs` |
| CI | GitHub Actions workflow included |

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌──────────┐
│  Angular 22  │ ──→  │  NestJS API  │ ──→  │  SQLite  │
│  (apps/web)  │ ←──  │  (apps/api)  │ ←──  │   DB     │
└─────────────┘      └─────────────┘      └──────────┘
     │                      │
  JWT Token            JWT Auth Guard
  localStorage         + ValidationPipe
```

## Prerequisites

- Node.js 22+
- npm 10+

## Local Setup

1. **Clone and install dependencies:**

```bash
cd /opt/data/repositorios/2026-06-16-finance-dashboard

# Install backend
cd apps/api
npm install

# Install frontend
cd ../web
npm install
```

2. **Configure environment:**

```bash
# Backend env (apps/api/.env)
cp apps/api/.env.example apps/api/.env
# Edit JWT_SECRET if desired
```

3. **Run the backend:**

```bash
cd apps/api
npm run start:dev
# API available at http://localhost:3000
# Swagger at http://localhost:3000/api/docs
```

4. **Run the frontend:**

```bash
cd apps/web
npm start
# App available at http://localhost:4200
```

5. **Seed demo data:**

```bash
curl -X POST http://localhost:3000/api/v1/seed
# Creates: demo user, categories, accounts, 20 transactions, 4 budgets
```

6. **Login:**

- Email: `demo@example.com`
- Password: `password123`

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | No | Register new user |
| POST | `/api/v1/auth/login` | No | Login |
| GET | `/api/v1/categories` | Yes | List categories |
| POST | `/api/v1/categories` | Yes | Create category |
| DELETE | `/api/v1/categories/:id` | Yes | Delete category |
| GET | `/api/v1/accounts` | Yes | List accounts |
| POST | `/api/v1/accounts` | Yes | Create account |
| GET | `/api/v1/accounts/:id` | Yes | Get account |
| DELETE | `/api/v1/accounts/:id` | Yes | Delete account |
| GET | `/api/v1/transactions` | Yes | List transactions (filterable) |
| POST | `/api/v1/transactions` | Yes | Create transaction |
| GET | `/api/v1/transactions/:id` | Yes | Get transaction |
| DELETE | `/api/v1/transactions/:id` | Yes | Delete transaction |
| GET | `/api/v1/budgets` | Yes | List budgets |
| POST | `/api/v1/budgets` | Yes | Create budget |
| DELETE | `/api/v1/budgets/:id` | Yes | Delete budget |
| GET | `/api/v1/budgets/summary` | Yes | Budget vs actuals |
| GET | `/api/v1/dashboard/summary` | Yes | Dashboard aggregated data |
| POST | `/api/v1/seed` | No | Seed demo data |

## Project Structure

```
2026-06-16-finance-dashboard/
├── apps/
│   ├── api/               # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/      # Auth module (JWT, register, login)
│   │   │   ├── accounts/  # Account management
│   │   │   ├── categories/# Category management
│   │   │   ├── transactions/ # Transaction management
│   │   │   ├── budgets/   # Budget management & summaries
│   │   │   ├── dashboard/ # Dashboard aggregation
│   │   │   ├── seed/      # Demo data seeding
│   │   │   ├── entities/  # TypeORM entity definitions
│   │   │   └── migrations/# SQL migration files
│   │   └── ...
│   └── web/               # Angular 22 frontend
│       └── src/app/
│           ├── services/  # API & auth services
│           ├── guards/    # Auth guard
│           ├── login/     # Login/register page
│           ├── dashboard/ # Dashboard overview
│           ├── transactions/ # Transaction management
│           ├── budgets/   # Budget management
│           └── reports/   # Financial reports
├── docs/                  # Documentation
├── .github/workflows/     # GitHub Actions CI
└── README.md
```

## Quality

- `npm run build` (apps/api) — TypeScript compiles with 0 errors
- `npm run build` (apps/web) — Angular builds with 0 errors
- `npm test` (apps/api) — 27 tests pass (auth, transactions, budgets)
- Lazy-loaded routes — 7 separate chunks for optimal loading

## Roadmap

- [ ] PostgreSQL / Neon database with proper migrations
- [ ] GitHub CI pipeline (workflow YAML included)
- [ ] Email/SMS notifications for budget alerts
- [ ] Recurring transactions (subscriptions, bills)
- [ ] Multi-currency support with exchange rates
- [ ] Transaction search with full-text search
- [ ] Export to CSV/PDF
- [ ] Mobile app (PWA)
- [ ] Data visualization charts (Chart.js or D3)

## License

MIT
