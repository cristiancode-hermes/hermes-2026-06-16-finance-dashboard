import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface Account {
  id: number;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
  balance: number;
  currency: string;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  createdAt: string;
}

export interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense';
  account: Account;
  category: Category;
  createdAt: string;
}

export interface Budget {
  id: number;
  category: Category;
  month: number;
  year: number;
  limit: number;
  spent: number;
  createdAt: string;
}

export interface BudgetSummary {
  id: number;
  category: Category;
  month: number;
  year: number;
  limit: number;
  spent: number;
  remaining: number;
}

export interface DashboardSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  recentTransactions: Transaction[];
  budgetStatus: BudgetSummary[];
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = '/api/v1';

  private handleError<T>(operation: string) {
    return (error: HttpErrorResponse): Observable<never> => {
      if (error.status === 401) {
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
      }
      const message = error.error?.message || error.message || `Error in ${operation}`;
      return throwError(() => new Error(message));
    };
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Auth
  login(email: string, password: string): Observable<{ access_token: string }> {
    return this.http
      .post<{ access_token: string }>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(catchError(this.handleError('login')));
  }

  register(email: string, password: string, name: string): Observable<{ access_token: string }> {
    return this.http
      .post<{ access_token: string }>(`${this.baseUrl}/auth/register`, { email, password, name })
      .pipe(catchError(this.handleError('register')));
  }

  // Categories
  getCategories(): Observable<Category[]> {
    return this.http
      .get<Category[]>(`${this.baseUrl}/categories`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('getCategories')));
  }

  createCategory(data: { name: string; type: string; icon?: string; color?: string }): Observable<Category> {
    return this.http
      .post<Category>(`${this.baseUrl}/categories`, data, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('createCategory')));
  }

  deleteCategory(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/categories/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('deleteCategory')));
  }

  // Accounts
  getAccounts(): Observable<Account[]> {
    return this.http
      .get<Account[]>(`${this.baseUrl}/accounts`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('getAccounts')));
  }

  createAccount(data: { name: string; type: string; balance?: number; currency?: string }): Observable<Account> {
    return this.http
      .post<Account>(`${this.baseUrl}/accounts`, data, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('createAccount')));
  }

  getAccount(id: number): Observable<Account> {
    return this.http
      .get<Account>(`${this.baseUrl}/accounts/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('getAccount')));
  }

  deleteAccount(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/accounts/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('deleteAccount')));
  }

  // Transactions
  getTransactions(params?: {
    accountId?: number;
    categoryId?: number;
    startDate?: string;
    endDate?: string;
  }): Observable<Transaction[]> {
    let httpParams = new HttpParams();
    if (params?.accountId) httpParams = httpParams.set('accountId', params.accountId);
    if (params?.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);
    return this.http
      .get<Transaction[]>(`${this.baseUrl}/transactions`, {
        headers: this.getAuthHeaders(),
        params: httpParams,
      })
      .pipe(catchError(this.handleError('getTransactions')));
  }

  createTransaction(data: {
    amount: number;
    description: string;
    date: string;
    type: 'income' | 'expense';
    accountId: number;
    categoryId: number;
  }): Observable<Transaction> {
    return this.http
      .post<Transaction>(`${this.baseUrl}/transactions`, data, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('createTransaction')));
  }

  getTransaction(id: number): Observable<Transaction> {
    return this.http
      .get<Transaction>(`${this.baseUrl}/transactions/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('getTransaction')));
  }

  deleteTransaction(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/transactions/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('deleteTransaction')));
  }

  // Budgets
  getBudgets(): Observable<Budget[]> {
    return this.http
      .get<Budget[]>(`${this.baseUrl}/budgets`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('getBudgets')));
  }

  createBudget(data: { categoryId: number; month: number; year: number; limit: number }): Observable<Budget> {
    return this.http
      .post<Budget>(`${this.baseUrl}/budgets`, data, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('createBudget')));
  }

  deleteBudget(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/budgets/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('deleteBudget')));
  }

  getBudgetSummary(): Observable<BudgetSummary[]> {
    return this.http
      .get<BudgetSummary[]>(`${this.baseUrl}/budgets/summary`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('getBudgetSummary')));
  }

  // Dashboard
  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http
      .get<DashboardSummary>(`${this.baseUrl}/dashboard/summary`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('getDashboardSummary')));
  }

  // Seed
  seed(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/seed`, {}, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('seed')));
  }
}
