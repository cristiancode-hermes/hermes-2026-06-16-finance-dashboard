# API Reference

The Finance Dashboard API is built with NestJS 11 and follows RESTful conventions. All routes are prefixed with `/api/v1` via NestJS URI versioning. Interactive Swagger documentation is available at `/api/docs` when the server is running.

**Base URL:** `http://localhost:3000/api/v1`

**Swagger UI:** `http://localhost:3000/api/docs`

---

## Authentication Flow

The API uses JWT (JSON Web Token) for stateless authentication. The flow is:

1. **Register** a new user at `POST /api/v1/auth/register` (or use the demo seed data).
2. **Login** at `POST /api/v1/auth/login` to receive a JWT token.
3. **Include the JWT** in all subsequent requests as an `Authorization: Bearer <token>` header.
4. **Protected routes** return `401 Unauthorized` if the token is missing, expired, or invalid.

Tokens are signed with the `JWT_SECRET` environment variable (defaults to `finance-dashboard-secret-key` in development) and expire after 7 days.

---

## Endpoints

### Auth

#### `POST /api/v1/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Validation rules:**
- `email`: Must be a valid email format
- `password`: Minimum 6 characters
- `name`: Required string

**Success Response** (201 Created):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-06-16T10:00:00.000Z"
  }
}
```

**Error Responses:**
```json
// 409 Conflict - Email already exists
{ "message": "Email already registered", "error": "Conflict", "statusCode": 409 }
```

#### `POST /api/v1/auth/login`

Authenticate with existing credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-06-16T10:00:00.000Z"
  }
}
```

**Error Responses:**
```json
// 401 Unauthorized - Invalid credentials
{ "message": "Invalid credentials", "error": "Unauthorized", "statusCode": 401 }
```

---

### Accounts

All account endpoints require `Authorization: Bearer <token>` header.

#### `GET /api/v1/accounts`

List all accounts for the authenticated user.

**Success Response** (200 OK):
```json
[
  {
    "id": 1,
    "name": "Checking Account",
    "type": "checking",
    "balance": 5000,
    "currency": "USD",
    "userId": 1,
    "createdAt": "2026-06-16T10:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Savings Account",
    "type": "savings",
    "balance": 10000,
    "currency": "USD",
    "userId": 1,
    "createdAt": "2026-06-16T10:00:00.000Z"
  }
]
```

#### `GET /api/v1/accounts/:id`

Get a single account with computed current balance.

**Success Response** (200 OK):
```json
{
  "id": 1,
  "name": "Checking Account",
  "type": "checking",
  "balance": 5000,
  "currentBalance": 5230,
  "currency": "USD",
  "userId": 1,
  "createdAt": "2026-06-16T10:00:00.000Z"
}
```

The `currentBalance` field is computed as `balance + SUM(income - expense)` for all transactions linked to this account.

**Error Response:**
```json
// 404 Not Found
{ "message": "Account not found", "error": "Not Found", "statusCode": 404 }
```

#### `POST /api/v1/accounts`

Create a new account.

**Request Body:**
```json
{
  "name": "New Account",
  "type": "checking",
  "balance": 1000,
  "currency": "USD"
}
```

**Validation rules:**
- `name`: Required string
- `type`: Required enum: `checking`, `savings`, `credit`, `investment`, `cash`
- `balance`: Optional number (min 0, default 0)
- `currency`: Optional string (default "USD")

**Success Response** (201 Created):
```json
{
  "id": 4,
  "name": "New Account",
  "type": "checking",
  "balance": 1000,
  "currency": "USD",
  "userId": 1,
  "createdAt": "2026-06-16T10:00:00.000Z"
}
```

#### `PUT /api/v1/accounts/:id`

Update an existing account.

**Request Body:** Same as POST

**Success Response** (200 OK): Returns the updated account object.

#### `DELETE /api/v1/accounts/:id`

Delete an account. **Cannot delete accounts that have transactions.** Delete transactions first.

**Success Response** (204 No Content): No body.

**Error Responses:**
```json
// 400 Bad Request
{ "message": "Cannot delete account with existing transactions. Delete transactions first.", "error": "Bad Request", "statusCode": 400 }

// 404 Not Found
{ "message": "Account not found", "error": "Not Found", "statusCode": 404 }
```

---

### Categories

All category endpoints require `Authorization: Bearer <token>` header.

#### `GET /api/v1/categories`

List all categories for the authenticated user.

**Success Response** (200 OK):
```json
[
  {
    "id": 1,
    "name": "Salary",
    "type": "income",
    "icon": "💼",
    "color": "#22c55e",
    "userId": 1,
    "createdAt": "2026-06-16T10:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Food",
    "type": "expense",
    "icon": "🍕",
    "color": "#ef4444",
    "userId": 1,
    "createdAt": "2026-06-16T10:00:00.000Z"
  }
]
```

#### `GET /api/v1/categories/:id`

Get a single category.

#### `POST /api/v1/categories`

Create a new category.

**Request Body:**
```json
{
  "name": "Shopping",
  "type": "expense",
  "icon": "🛒",
  "color": "#ec4899"
}
```

**Validation rules:**
- `name`: Required string
- `type`: Required enum: `income` or `expense`
- `icon`: Optional string
- `color`: Optional hex color string

**Success Response** (201 Created): Returns the created category.

#### `PUT /api/v1/categories/:id`

Update a category.

#### `DELETE /api/v1/categories/:id`

Delete a category.

**Success Response** (204 No Content).

---

### Transactions

All transaction endpoints require `Authorization: Bearer <token>` header.

#### `GET /api/v1/transactions`

List transactions with optional filters. Returns transactions sorted by date descending (newest first), with nested `account` and `category` objects.

**Query Parameters (all optional):**

| Parameter   | Type   | Description                                    |
|-------------|--------|------------------------------------------------|
| `accountId` | number | Filter by account ID                           |
| `categoryId`| number | Filter by category ID                          |
| `startDate` | string | ISO date string (YYYY-MM-DD). Filter transactions on or after this date |
| `endDate`   | string | ISO date string (YYYY-MM-DD). Filter transactions on or before this date |

**Examples:**

```http
GET /api/v1/transactions?accountId=1&startDate=2026-06-01&endDate=2026-06-30
GET /api/v1/transactions?categoryId=3
GET /api/v1/transactions?startDate=2026-01-01
```

**Success Response** (200 OK):
```json
[
  {
    "id": 1,
    "amount": 150.50,
    "description": "Grocery shopping",
    "date": "2026-06-16",
    "type": "expense",
    "accountId": 1,
    "categoryId": 3,
    "userId": 1,
    "createdAt": "2026-06-16T10:00:00.000Z",
    "account": {
      "id": 1,
      "name": "Checking Account",
      "type": "checking",
      "balance": 5000,
      "currency": "USD",
      "userId": 1,
      "createdAt": "2026-06-16T10:00:00.000Z"
    },
    "category": {
      "id": 3,
      "name": "Food",
      "type": "expense",
      "icon": "🍕",
      "color": "#ef4444",
      "userId": 1,
      "createdAt": "2026-06-16T10:00:00.000Z"
    }
  }
]
```

#### `GET /api/v1/transactions/:id`

Get a single transaction with nested account and category.

**Success Response** (200 OK): Single transaction object as above.

**Error Responses:**
```json
// 404 Not Found
{ "message": "Transaction not found", "error": "Not Found", "statusCode": 404 }
```

#### `POST /api/v1/transactions`

Create a new transaction.

**Request Body:**
```json
{
  "amount": 150.50,
  "description": "Grocery shopping",
  "date": "2026-06-16",
  "type": "expense",
  "accountId": 1,
  "categoryId": 3
}
```

**Validation rules:**
- `amount`: Required number (min 0)
- `description`: Required string
- `date`: Required ISO date string (YYYY-MM-DD)
- `type`: Required enum: `income` or `expense`
- `accountId`: Required number (must exist in DB)
- `categoryId`: Required number (must exist in DB)

**Success Response** (201 Created): Returns the created transaction.

#### `PUT /api/v1/transactions/:id`

Update an existing transaction. All fields are required.

**Request Body:** Same fields as POST.

**Success Response** (200 OK): Returns the updated transaction.

#### `DELETE /api/v1/transactions/:id`

Delete a transaction.

**Success Response** (204 No Content).

---

### Budgets

All budget endpoints require `Authorization: Bearer <token>` header.

#### `GET /api/v1/budgets`

List all budgets for the authenticated user, ordered by creation date descending.

**Success Response** (200 OK):
```json
[
  {
    "id": 1,
    "categoryId": 3,
    "month": 6,
    "year": 2026,
    "limit": 800,
    "spent": 0,
    "userId": 1,
    "createdAt": "2026-06-16T10:00:00.000Z",
    "category": {
      "id": 3,
      "name": "Food",
      "type": "expense",
      "icon": "🍕",
      "color": "#ef4444",
      "userId": 1,
      "createdAt": "2026-06-16T10:00:00.000Z"
    }
  }
]
```

#### `GET /api/v1/budgets/summary`

Get budget summaries with computed actual spending for the current month. This is the primary endpoint used by the frontend budget and dashboard pages.

**Success Response** (200 OK):
```json
[
  {
    "id": 1,
    "category": {
      "id": 3,
      "name": "Food",
      "type": "expense",
      "icon": "🍕",
      "color": "#ef4444",
      "userId": 1,
      "createdAt": "2026-06-16T10:00:00.000Z"
    },
    "limit": 800,
    "actual": 320.50,
    "remaining": 479.50,
    "percentage": 40,
    "month": 6,
    "year": 2026
  }
]
```

The `actual` field is computed by summing all `expense` transactions for the budget's category in the current month. `percentage` is `Math.round((actual / limit) * 100)`, capped at 0 when limit is 0.

#### `GET /api/v1/budgets/:id`

Get a single budget with its category relation.

#### `POST /api/v1/budgets`

Create a new budget.

**Request Body:**
```json
{
  "categoryId": 3,
  "month": 6,
  "year": 2026,
  "limit": 800
}
```

**Validation rules:**
- `categoryId`: Required number
- `month`: Required number (1-12)
- `year`: Required number
- `limit`: Required number (min 0)

**Success Response** (201 Created):
```json
{
  "id": 5,
  "categoryId": 3,
  "month": 6,
  "year": 2026,
  "limit": 800,
  "spent": 0,
  "userId": 1,
  "createdAt": "2026-06-16T10:00:00.000Z"
}
```

#### `PUT /api/v1/budgets/:id`

Update an existing budget.

#### `DELETE /api/v1/budgets/:id`

Delete a budget.

**Success Response** (204 No Content).

---

### Dashboard

All dashboard endpoints require `Authorization: Bearer <token>` header.

#### `GET /api/v1/dashboard/summary`

Get aggregated financial data for the dashboard overview page. This endpoint combines data from multiple tables in a single response.

**Success Response** (200 OK):
```json
{
  "totalBalance": 15000,
  "monthlyIncome": 5000,
  "monthlyExpenses": 3200,
  "recentTransactions": [
    {
      "id": 1,
      "amount": 150.50,
      "description": "Grocery shopping",
      "date": "2026-06-16",
      "type": "expense",
      "account": { "id": 1, "name": "Checking Account", ... },
      "category": { "id": 3, "name": "Food", ... },
      "createdAt": "2026-06-16T10:00:00.000Z"
    }
  ],
  "budgetStatus": [
    {
      "id": 1,
      "category": { "id": 3, "name": "Food", ... },
      "limit": 800,
      "actual": 320.50,
      "remaining": 479.50,
      "percentage": 40
    }
  ]
}
```

- `totalBalance`: Sum of all account `balance` values
- `monthlyIncome`: Sum of all `income` transactions for the current month
- `monthlyExpenses`: Sum of all `expense` transactions for the current month
- `recentTransactions`: Last 5 transactions (sorted by date DESC)
- `budgetStatus`: Same data as `GET /api/v1/budgets/summary` for the current month

---

### Seed

#### `POST /api/v1/seed`

Seed the database with demo data. This endpoint is **not** behind the JWT guard.

**Success Response** (201 Created):
```json
{
  "message": "Demo data seeded successfully",
  "user": { "email": "demo@example.com", "name": "Demo User" },
  "categories": 6,
  "accounts": 3,
  "transactions": 20,
  "budgets": 4
}
```

**Error Responses:**
```json
// 409 Conflict - Already seeded
{ "message": "Demo data already seeded. Delete the database file to re-seed.", "error": "Conflict", "statusCode": 409 }
```

**Seed data includes:**
- 1 demo user (`demo@example.com` / `password123`)
- 6 categories (2 income: Salary, Freelance; 4 expense: Food, Transport, Entertainment, Utilities)
- 3 accounts (Checking $5,000, Savings $10,000, Credit Card -$500)
- 20 transactions over the last 30 days (mix of income and expense)
- 4 budgets for the current month (Food $800, Transport $300, Entertainment $200, Utilities $400)

---

## Error Response Format

All errors follow a consistent format:

```json
{
  "message": "Human-readable error description",
  "error": "Error type (e.g., Not Found, Bad Request, Unauthorized)",
  "statusCode": 401
}
```

| Status Code | Meaning           | Common Causes                                     |
|-------------|-------------------|---------------------------------------------------|
| 400         | Bad Request       | Validation failed, account has transactions        |
| 401         | Unauthorized      | Missing/invalid/expired JWT, bad credentials      |
| 404         | Not Found         | Entity ID doesn't exist                            |
| 409         | Conflict          | Email already registered, data already seeded      |
| 422         | Unprocessable     | Validation pipe errors (field-level)               |

### Validation Error Format

When the `ValidationPipe` rejects a request, the response includes field-level details:

```json
{
  "message": [
    "password must be longer than or equal to 6 characters",
    "email must be an email"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

## Swagger Documentation

When the server is running, interactive API documentation is available at:

```
http://localhost:3000/api/docs
```

The Swagger document is generated automatically from NestJS decorators (`@ApiTags`, `@ApiBearerAuth`, etc.) and DTO class definitions with `class-validator` decorators. It includes:

- All endpoints with request/response schemas
- JWT authentication button (click "Authorize" and paste your token)
- Schema definitions for all DTOs and entities
- Try-it-out functionality for testing endpoints directly in the browser
