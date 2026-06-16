import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService, Category, Account, Transaction, BudgetSummary, DashboardSummary } from './api.service';
import { Router } from '@angular/router';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiService,
        { provide: Router, useValue: routerSpy },
      ],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should POST to /api/v1/auth/login', () => {
      const mockResponse = { access_token: 'jwt-token' };
      service.login('test@example.com', 'password123').subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/v1/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@example.com', password: 'password123' });
      req.flush(mockResponse);
    });
  });

  describe('register', () => {
    it('should POST to /api/v1/auth/register', () => {
      const mockResponse = { access_token: 'jwt-token' };
      service.register('new@example.com', 'password123', 'New User').subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/v1/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });
      req.flush(mockResponse);
    });
  });

  describe('getCategories', () => {
    it('should GET /api/v1/categories', () => {
      localStorage.setItem('token', 'test-token');
      const mockCategories: Category[] = [{ id: 1, name: 'Food', type: 'expense' as const, icon: 'food', color: '#ff0000', createdAt: '2025-01-01' }];
      service.getCategories().subscribe((res) => {
        expect(res).toEqual(mockCategories);
      });

      const req = httpMock.expectOne('/api/v1/categories');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.has('Authorization')).toBeTruthy();
      req.flush(mockCategories);
    });
  });

  describe('getAccounts', () => {
    it('should GET /api/v1/accounts', () => {
      const mockAccounts: Account[] = [{ id: 1, name: 'Checking', type: 'checking' as const, balance: 500, currency: 'USD', createdAt: '2025-01-01' }];
      service.getAccounts().subscribe((res) => {
        expect(res).toEqual(mockAccounts);
      });

      const req = httpMock.expectOne('/api/v1/accounts');
      expect(req.request.method).toBe('GET');
      req.flush(mockAccounts);
    });
  });

  describe('getTransactions', () => {
    it('should GET /api/v1/transactions with optional params', () => {
      const mockTxs: Transaction[] = [{ id: 1, amount: 100, description: 'Test', date: '2025-01-01', type: 'expense' as const, account: {} as any, category: {} as any, createdAt: '2025-01-01' }];
      service.getTransactions({ accountId: 1 }).subscribe((res) => {
        expect(res).toEqual(mockTxs);
      });

      const req = httpMock.expectOne('/api/v1/transactions?accountId=1');
      expect(req.request.method).toBe('GET');
      req.flush(mockTxs);
    });

    it('should call without params', () => {
      service.getTransactions().subscribe();
      const req = httpMock.expectOne('/api/v1/transactions');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('getBudgetSummary', () => {
    it('should GET /api/v1/budgets/summary', () => {
      const mockSummary: BudgetSummary[] = [{ id: 1, category: {} as any, month: 1, year: 2025, limit: 500, spent: 300, remaining: 200 }];
      service.getBudgetSummary().subscribe((res) => {
        expect(res).toEqual(mockSummary);
      });

      const req = httpMock.expectOne('/api/v1/budgets/summary');
      expect(req.request.method).toBe('GET');
      req.flush(mockSummary);
    });
  });

  describe('getDashboardSummary', () => {
    it('should GET /api/v1/dashboard/summary', () => {
      const mockSummary: DashboardSummary = { totalBalance: 10000, monthlyIncome: 5000, monthlyExpenses: 2000, recentTransactions: [], budgetStatus: [] };
      service.getDashboardSummary().subscribe((res) => {
        expect(res).toEqual(mockSummary);
      });

      const req = httpMock.expectOne('/api/v1/dashboard/summary');
      expect(req.request.method).toBe('GET');
      req.flush(mockSummary);
    });
  });

  describe('seed', () => {
    it('should POST /api/v1/seed', () => {
      service.seed().subscribe();

      const req = httpMock.expectOne('/api/v1/seed');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({});
    });
  });

  describe('HTTP error handling', () => {
    it('should remove token and redirect on 401', () => {
      localStorage.setItem('token', 'some-token');
      service.getCategories().subscribe({
        error: (err) => {
          expect(err).toBeTruthy();
        },
      });

      const req = httpMock.expectOne('/api/v1/categories');
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      expect(localStorage.getItem('token')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
