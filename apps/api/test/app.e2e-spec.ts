import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Module } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../src/auth/auth.module';
import { AccountsModule } from '../src/accounts/accounts.module';
import { CategoriesModule } from '../src/categories/categories.module';
import { TransactionsModule } from '../src/transactions/transactions.module';
import { BudgetsModule } from '../src/budgets/budgets.module';
import { DashboardModule } from '../src/dashboard/dashboard.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      autoLoadEntities: true,
      synchronize: true,
      logging: false,
    }),
    AuthModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    BudgetsModule,
    DashboardModule,
  ],
})
class TestAppModule {}

describe('Finance Dashboard API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  // Shared IDs across CRUD test suites
  let accountId: number;
  let categoryIdExpense: number;
  let categoryIdIncome: number;
  let transactionId: number;
  let budgetId: number;

  // ── Setup / Teardown ─────────────────────────────────
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ═══════════════════════════════════════════════════════
  //  1. AUTH
  // ═══════════════════════════════════════════════════════
  describe('Auth', () => {
    const user = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('POST /auth/register — should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.name).toBe('Test User');
      expect(res.body.user).not.toHaveProperty('password');
      authToken = res.body.token;
    });

    it('POST /auth/register — should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(409);
    });

    it('POST /auth/register — should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'bad' })
        .expect(400);
    });

    it('POST /auth/login — should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user).not.toHaveProperty('password');
      authToken = res.body.token;
    });

    it('POST /auth/login — should reject wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'wrongpass' })
        .expect(401);
    });

    it('POST /auth/login — should reject non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' })
        .expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  2. CATEGORIES CRUD
  // ═══════════════════════════════════════════════════════
  describe('Categories', () => {
    it('POST /categories — should create an expense category', async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Groceries', type: 'expense', icon: '🛒', color: '#22c55e' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Groceries');
      expect(res.body.type).toBe('expense');
      expect(res.body.icon).toBe('🛒');
      categoryIdExpense = res.body.id;
    });

    it('POST /categories — should create an income category', async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Salary', type: 'income' })
        .expect(201);

      expect(res.body.name).toBe('Salary');
      expect(res.body.type).toBe('income');
      categoryIdIncome = res.body.id;
    });

    it('POST /categories — should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'No Auth', type: 'expense' })
        .expect(401);
    });

    it('POST /categories — should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Missing type' })
        .expect(400);
    });

    it('GET /categories — should list all categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body.some((c: any) => c.name === 'Groceries')).toBe(true);
    });

    it('GET /categories/:id — should get category by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/categories/${categoryIdExpense}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.id).toBe(categoryIdExpense);
      expect(res.body.name).toBe('Groceries');
    });

    it('GET /categories/:id — should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .get('/categories/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('PUT /categories/:id — should update a category', async () => {
      const res = await request(app.getHttpServer())
        .put(`/categories/${categoryIdExpense}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Food & Drinks', type: 'expense', icon: '🍔' })
        .expect(200);

      expect(res.body.name).toBe('Food & Drinks');
      expect(res.body.icon).toBe('🍔');
    });

    it('DELETE /categories/:id — should delete a category', async () => {
      const { body: cat } = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Temp', type: 'expense' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/categories/${cat.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/categories/${cat.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  3. ACCOUNTS CRUD
  // ═══════════════════════════════════════════════════════
  describe('Accounts', () => {
    it('POST /accounts — should create an account', async () => {
      const res = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Checking Account',
          type: 'checking',
          balance: 1500,
          currency: 'USD',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Checking Account');
      expect(res.body.type).toBe('checking');
      expect(res.body.balance).toBe(1500);
      expect(res.body.currency).toBe('USD');
      accountId = res.body.id;
    });

    it('POST /accounts — should create another account', async () => {
      const res = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Savings Account',
          type: 'savings',
          balance: 5000,
          currency: 'USD',
        })
        .expect(201);

      expect(res.body.name).toBe('Savings Account');
    });

    it('POST /accounts — should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/accounts')
        .send({ name: 'No Auth', type: 'checking' })
        .expect(401);
    });

    it('POST /accounts — should validate enum field', async () => {
      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Bad type', type: 'invalid' })
        .expect(400);
    });

    it('GET /accounts — should list user accounts', async () => {
      const res = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /accounts/:id — should get account with currentBalance', async () => {
      const res = await request(app.getHttpServer())
        .get(`/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.id).toBe(accountId);
      expect(res.body).toHaveProperty('currentBalance');
      expect(typeof res.body.currentBalance).toBe('number');
    });

    it('GET /accounts/:id — should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .get('/accounts/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('PUT /accounts/:id — should update an account', async () => {
      const res = await request(app.getHttpServer())
        .put(`/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Main Checking',
          type: 'checking',
          balance: 2000,
          currency: 'USD',
        })
        .expect(200);

      expect(res.body.name).toBe('Main Checking');
      expect(res.body.balance).toBe(2000);
    });

    it('DELETE /accounts/:id — should delete account without transactions', async () => {
      // Create a temporary account and delete it
      const { body: tmp } = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Temp', type: 'cash', balance: 0 })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/accounts/${tmp.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/accounts/${tmp.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('DELETE /accounts/:id — should reject delete when account has transactions', async () => {
      // Create a transaction linked to the main account
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50,
          description: 'Test grocery',
          date: new Date().toISOString().slice(0, 10),
          type: 'expense',
          accountId,
          categoryId: categoryIdExpense,
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  4. TRANSACTIONS CRUD
  // ═══════════════════════════════════════════════════════
  describe('Transactions', () => {
    const today = new Date().toISOString().slice(0, 10);

    it('POST /transactions — should create an expense transaction', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 75.50,
          description: 'Restaurant dinner',
          date: today,
          type: 'expense',
          accountId,
          categoryId: categoryIdExpense,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.amount).toBe(75.5);
      expect(res.body.description).toBe('Restaurant dinner');
      expect(res.body.type).toBe('expense');
      expect(res.body.accountId).toBe(accountId);
      expect(res.body.categoryId).toBe(categoryIdExpense);
      transactionId = res.body.id;
    });

    it('POST /transactions — should create an income transaction', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          description: 'Monthly salary',
          date: today,
          type: 'income',
          accountId,
          categoryId: categoryIdIncome,
        })
        .expect(201);

      expect(res.body.amount).toBe(3000);
      expect(res.body.type).toBe('income');
    });

    it('POST /transactions — should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          amount: 10,
          description: 'No auth',
          date: today,
          type: 'expense',
          accountId,
          categoryId: categoryIdExpense,
        })
        .expect(401);
    });

    it('POST /transactions — should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Missing fields' })
        .expect(400);
    });

    it('GET /transactions — should list all transactions', async () => {
      const res = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0]).toHaveProperty('account');
      expect(res.body[0]).toHaveProperty('category');
    });

    it('GET /transactions — should filter by accountId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/transactions?accountId=${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((t: any) => t.accountId === accountId)).toBe(true);
    });

    it('GET /transactions — should filter by categoryId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/transactions?categoryId=${categoryIdIncome}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.every((t: any) => t.categoryId === categoryIdIncome)).toBe(true);
    });

    it('GET /transactions — should filter by date range', async () => {
      const res = await request(app.getHttpServer())
        .get(`/transactions?startDate=${today}&endDate=${today}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /transactions/:id — should get transaction by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.id).toBe(transactionId);
      expect(res.body.description).toBe('Restaurant dinner');
      expect(res.body).toHaveProperty('account');
      expect(res.body).toHaveProperty('category');
    });

    it('GET /transactions/:id — should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .get('/transactions/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('PUT /transactions/:id — should update a transaction', async () => {
      const res = await request(app.getHttpServer())
        .put(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 80,
          description: 'Fancy dinner',
          date: today,
          type: 'expense',
          accountId,
          categoryId: categoryIdExpense,
        })
        .expect(200);

      expect(res.body.amount).toBe(80);
      expect(res.body.description).toBe('Fancy dinner');
    });

    it('DELETE /transactions/:id — should delete a transaction', async () => {
      const { body: tx } = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 20,
          description: 'Delete me',
          date: today,
          type: 'expense',
          accountId,
          categoryId: categoryIdExpense,
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/transactions/${tx.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/transactions/${tx.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  5. BUDGETS
  // ═══════════════════════════════════════════════════════
  describe('Budgets', () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    it('POST /budgets — should create a budget', async () => {
      const res = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryId: categoryIdExpense,
          month,
          year,
          limit: 500,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.categoryId).toBe(categoryIdExpense);
      expect(res.body.limit).toBe(500);
      expect(res.body.month).toBe(month);
      expect(res.body.year).toBe(year);
      expect(res.body.spent).toBe(0);
      budgetId = res.body.id;
    });

    it('POST /budgets — should create another budget for income category', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryId: categoryIdIncome,
          month,
          year,
          limit: 9999,
        })
        .expect(201);
    });

    it('POST /budgets — should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .send({ categoryId: categoryIdExpense, month, year, limit: 100 })
        .expect(401);
    });

    it('POST /budgets — should validate fields', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId: categoryIdExpense, month: 13, year, limit: 100 })
        .expect(400);
    });

    it('GET /budgets — should list budgets with category relation', async () => {
      const res = await request(app.getHttpServer())
        .get('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0]).toHaveProperty('category');
      expect(res.body.some((b: any) => b.id === budgetId)).toBe(true);
    });

    it('GET /budgets/summary — should return current month summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/budgets/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('limit');
        expect(res.body[0]).toHaveProperty('actual');
        expect(res.body[0]).toHaveProperty('remaining');
        expect(res.body[0]).toHaveProperty('percentage');
        expect(res.body[0]).toHaveProperty('category');
      }
    });

    it('GET /budgets/:id — should get budget by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.id).toBe(budgetId);
      expect(res.body.limit).toBe(500);
      expect(res.body).toHaveProperty('category');
    });

    it('GET /budgets/:id — should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .get('/budgets/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('PUT /budgets/:id — should update a budget', async () => {
      const res = await request(app.getHttpServer())
        .put(`/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryId: categoryIdExpense,
          month,
          year,
          limit: 600,
        })
        .expect(200);

      expect(res.body.limit).toBe(600);
    });

    it('DELETE /budgets/:id — should delete a budget', async () => {
      const { body: tmp } = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryId: categoryIdExpense,
          month,
          year,
          limit: 1,
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/budgets/${tmp.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/budgets/${tmp.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  6. DASHBOARD SUMMARY
  // ═══════════════════════════════════════════════════════
  describe('Dashboard', () => {
    it('GET /dashboard/summary — should return full dashboard summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Structure checks
      expect(res.body).toHaveProperty('totalBalance');
      expect(res.body).toHaveProperty('monthlyIncome');
      expect(res.body).toHaveProperty('monthlyExpenses');
      expect(res.body).toHaveProperty('recentTransactions');
      expect(res.body).toHaveProperty('budgetStatus');

      // Types
      expect(typeof res.body.totalBalance).toBe('number');
      expect(typeof res.body.monthlyIncome).toBe('number');
      expect(typeof res.body.monthlyExpenses).toBe('number');
      expect(Array.isArray(res.body.recentTransactions)).toBe(true);
      expect(Array.isArray(res.body.budgetStatus)).toBe(true);

      // Monthly values should reflect our seeded data (income 3000, expense ~80)
      expect(res.body.monthlyIncome).toBeGreaterThan(0);
      expect(res.body.monthlyExpenses).toBeGreaterThan(0);

      // Recent transactions should include related entities
      if (res.body.recentTransactions.length > 0) {
        const rt = res.body.recentTransactions[0];
        expect(rt).toHaveProperty('account');
        expect(rt).toHaveProperty('category');
      }

      // Budget status should include percentage / remaining
      if (res.body.budgetStatus.length > 0) {
        const bs = res.body.budgetStatus[0];
        expect(bs).toHaveProperty('limit');
        expect(bs).toHaveProperty('actual');
        expect(bs).toHaveProperty('remaining');
        expect(bs).toHaveProperty('percentage');
        expect(bs).toHaveProperty('category');
      }
    });

    it('GET /dashboard/summary — should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/summary')
        .expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  7. AUTHENTICATION GUARD (bonus edge cases)
  // ═══════════════════════════════════════════════════════
  describe('Authentication Guard', () => {
    const protectedEndpoints = [
      { method: 'get' as const, path: '/accounts' },
      { method: 'get' as const, path: '/accounts/1' },
      { method: 'post' as const, path: '/accounts', data: { name: 'x', type: 'checking' } },
      { method: 'put' as const, path: '/accounts/1', data: { name: 'x', type: 'checking' } },
      { method: 'delete' as const, path: '/accounts/1' },
      { method: 'get' as const, path: '/categories' },
      { method: 'post' as const, path: '/categories', data: { name: 'x', type: 'expense' } },
      { method: 'put' as const, path: '/categories/1', data: { name: 'x', type: 'expense' } },
      { method: 'delete' as const, path: '/categories/1' },
      { method: 'get' as const, path: '/transactions' },
      { method: 'post' as const, path: '/transactions', data: { amount: 1, description: 'x', date: '2024-01-01', type: 'expense', accountId: 1, categoryId: 1 } },
      { method: 'put' as const, path: '/transactions/1', data: { amount: 1, description: 'x', date: '2024-01-01', type: 'expense', accountId: 1, categoryId: 1 } },
      { method: 'delete' as const, path: '/transactions/1' },
      { method: 'get' as const, path: '/budgets' },
      { method: 'post' as const, path: '/budgets', data: { categoryId: 1, month: 1, year: 2024, limit: 100 } },
      { method: 'put' as const, path: '/budgets/1', data: { categoryId: 1, month: 1, year: 2024, limit: 100 } },
      { method: 'delete' as const, path: '/budgets/1' },
      { method: 'get' as const, path: '/budgets/summary' },
      { method: 'get' as const, path: '/dashboard/summary' },
    ];

    protectedEndpoints.forEach(({ method, path, data }) => {
      it(`${method.toUpperCase()} ${path} — should return 401 without token`, async () => {
        const req = (request(app.getHttpServer()) as any)[method](path);
        if (data) req.send(data);
        await req.expect(401);
      });
    });
  });
});
