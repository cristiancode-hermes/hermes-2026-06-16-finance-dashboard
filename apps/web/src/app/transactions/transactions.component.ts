import { Component, signal, inject, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Account, Category, Transaction } from '../services/api.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, FormsModule],
  template: `
    <div class="p-4">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Transactions</h2>
        @if (mode() === 'list') {
          <button
            (click)="mode.set('form')"
            class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition text-sm"
          >
            + Add Transaction
          </button>
        }
      </div>

      @switch (mode()) {
        @case ('form') {
          <!-- Add Transaction Form -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">New Transaction</h3>
            <form (ngSubmit)="addTransaction()" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  [(ngModel)]="formAmount"
                  name="amount"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  [(ngModel)]="formDescription"
                  name="description"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  [(ngModel)]="formDate"
                  name="date"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div class="flex gap-4 mt-2">
                  <label class="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="type" value="income" [(ngModel)]="formType" />
                    Income
                  </label>
                  <label class="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="type" value="expense" [(ngModel)]="formType" />
                    Expense
                  </label>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <select
                  [(ngModel)]="formAccountId"
                  name="accountId"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                >
                  <option value="" disabled>Select account</option>
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">{{ acc.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  [(ngModel)]="formCategoryId"
                  name="categoryId"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                >
                  <option value="" disabled>Select category</option>
                  @for (cat of categories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.icon }} {{ cat.name }}</option>
                  }
                </select>
              </div>
              <div class="md:col-span-2 flex gap-3 justify-end">
                <button
                  type="button"
                  (click)="cancelForm()"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="formSubmitting()"
                  class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition text-sm disabled:opacity-50"
                >
                  @if (formSubmitting()) {
                    Saving...
                  } @else {
                    Save Transaction
                  }
                </button>
              </div>
            </form>
            @if (formError()) {
              <div class="mt-3 text-red-600 text-sm">{{ formError() }}</div>
            }
          </div>
        }
        @case ('list') {
          <!-- Filter Bar -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Account</label>
                <select
                  [(ngModel)]="filterAccountId"
                  name="filterAccount"
                  (change)="loadTransactions()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option [value]="0">All Accounts</option>
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">{{ acc.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select
                  [(ngModel)]="filterCategoryId"
                  name="filterCategory"
                  (change)="loadTransactions()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option [value]="0">All Categories</option>
                  @for (cat of categories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.icon }} {{ cat.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  [(ngModel)]="filterStartDate"
                  name="filterStart"
                  (change)="loadTransactions()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  [(ngModel)]="filterEndDate"
                  name="filterEnd"
                  (change)="loadTransactions()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <!-- Transactions List -->
          @if (loading()) {
            <div class="space-y-3 animate-pulse">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="bg-gray-200 rounded-lg h-16"></div>
              }
            </div>
          } @else if (error()) {
            <div class="text-center py-16">
              <div class="text-red-500 text-5xl mb-4">&#9888;</div>
              <p class="text-gray-600 mb-4">{{ error() }}</p>
              <button (click)="loadTransactions()" class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition">
                Retry
              </button>
            </div>
          } @else if (transactions().length === 0) {
            <div class="text-center py-16">
              <div class="text-gray-400 text-5xl mb-4">&#128203;</div>
              <p class="text-gray-500 mb-2">No transactions found</p>
              <p class="text-gray-400 text-sm">Add a transaction to get started</p>
            </div>
          } @else {
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-left">
                  <thead>
                    <tr class="bg-gray-50 text-sm text-gray-500">
                      <th class="px-4 py-3 font-medium">Date</th>
                      <th class="px-4 py-3 font-medium">Category</th>
                      <th class="px-4 py-3 font-medium">Description</th>
                      <th class="px-4 py-3 font-medium">Account</th>
                      <th class="px-4 py-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (tx of transactions(); track tx.id) {
                      <tr class="border-t border-gray-100 hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm text-gray-600">{{ tx.date | date:'MMM dd, yyyy' }}</td>
                        <td class="px-4 py-3">
                          <span class="inline-flex items-center gap-1">
                            <span>{{ tx.category.icon || '&#9632;' }}</span>
                            <span class="text-sm text-gray-700">{{ tx.category.name }}</span>
                          </span>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-600">{{ tx.description }}</td>
                        <td class="px-4 py-3 text-sm text-gray-600">{{ tx.account.name }}</td>
                        <td class="px-4 py-3 text-sm font-medium text-right"
                          [class.text-green-600]="tx.type === 'income'"
                          [class.text-red-600]="tx.type === 'expense'"
                        >
                          {{ tx.type === 'income' ? '+' : '-' }}{{ tx.amount | currency }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }
      }
    </div>
  `,
})
export class TransactionsComponent implements OnInit {
  private api = inject(ApiService);

  mode = signal<'list' | 'form'>('list');
  transactions = signal<Transaction[]>([]);
  accounts = signal<Account[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  formSubmitting = signal(false);
  formError = signal<string | null>(null);

  // Filter state
  filterAccountId = 0;
  filterCategoryId = 0;
  filterStartDate = '';
  filterEndDate = '';

  // Form state
  formAmount = 0;
  formDescription = '';
  formDate = new Date().toISOString().split('T')[0];
  formType: 'income' | 'expense' = 'expense';
  formAccountId: number | null = null;
  formCategoryId: number | null = null;

  ngOnInit(): void {
    this.loadAccounts();
    this.loadCategories();
    this.loadTransactions();
  }

  loadAccounts(): void {
    this.api.getAccounts().subscribe({
      next: (res) => this.accounts.set(res),
      error: () => {},
    });
  }

  loadCategories(): void {
    this.api.getCategories().subscribe({
      next: (res) => this.categories.set(res),
      error: () => {},
    });
  }

  loadTransactions(): void {
    this.loading.set(true);
    this.error.set(null);
    const params: {
      accountId?: number;
      categoryId?: number;
      startDate?: string;
      endDate?: string;
    } = {};
    if (this.filterAccountId) params.accountId = this.filterAccountId;
    if (this.filterCategoryId) params.categoryId = this.filterCategoryId;
    if (this.filterStartDate) params.startDate = this.filterStartDate;
    if (this.filterEndDate) params.endDate = this.filterEndDate;

    this.api.getTransactions(params).subscribe({
      next: (res) => {
        this.transactions.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load transactions');
        this.loading.set(false);
      },
    });
  }

  cancelForm(): void {
    this.mode.set('list');
    this.resetForm();
  }

  resetForm(): void {
    this.formAmount = 0;
    this.formDescription = '';
    this.formDate = new Date().toISOString().split('T')[0];
    this.formType = 'expense';
    this.formAccountId = null;
    this.formCategoryId = null;
    this.formError.set(null);
  }

  addTransaction(): void {
    if (!this.formAmount || !this.formDescription || !this.formAccountId || !this.formCategoryId) {
      this.formError.set('Please fill in all required fields.');
      return;
    }

    this.formSubmitting.set(true);
    this.formError.set(null);

    this.api
      .createTransaction({
        amount: this.formAmount,
        description: this.formDescription,
        date: this.formDate,
        type: this.formType,
        accountId: this.formAccountId,
        categoryId: this.formCategoryId,
      })
      .subscribe({
        next: () => {
          this.formSubmitting.set(false);
          this.mode.set('list');
          this.resetForm();
          this.loadTransactions();
        },
        error: (err) => {
          this.formError.set(err.message || 'Failed to create transaction');
          this.formSubmitting.set(false);
        },
      });
  }
}
