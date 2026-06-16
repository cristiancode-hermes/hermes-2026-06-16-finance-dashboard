import { Component, signal, inject, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Budget, Category } from '../services/api.service';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CurrencyPipe, FormsModule],
  template: `
    <div class="p-4">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Budgets</h2>
        <button
          (click)="showAddForm.set(true)"
          class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition text-sm"
        >
          + Add Budget
        </button>
      </div>

      @if (showAddForm()) {
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">New Budget</h3>
          <form (ngSubmit)="addBudget()" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                [(ngModel)]="formCategoryId"
                name="budgetCategory"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              >
                <option value="" disabled>Select category</option>
                @for (cat of expenseCategories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.icon }} {{ cat.name }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                [(ngModel)]="formMonth"
                name="budgetMonth"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              >
                @for (m of months; track m.value) {
                  <option [value]="m.value">{{ m.label }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                [(ngModel)]="formYear"
                name="budgetYear"
                required
                min="2020"
                max="2099"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Limit</label>
              <input
                type="number"
                step="0.01"
                [(ngModel)]="formLimit"
                name="budgetLimit"
                required
                min="0.01"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
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
                  Save Budget
                }
              </button>
            </div>
          </form>
          @if (formError()) {
            <div class="mt-3 text-red-600 text-sm">{{ formError() }}</div>
          }
        </div>
      }

      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          @for (i of [1,2,3]; track i) {
            <div class="bg-gray-200 rounded-xl h-48"></div>
          }
        </div>
      } @else if (error()) {
        <div class="text-center py-16">
          <div class="text-red-500 text-5xl mb-4">&#9888;</div>
          <p class="text-gray-600 mb-4">{{ error() }}</p>
          <button
            (click)="loadBudgets()"
            class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      } @else if (budgets().length === 0) {
        <div class="text-center py-16">
          <div class="text-gray-400 text-5xl mb-4">&#128176;</div>
          <p class="text-gray-500 mb-2">No budgets set</p>
          <p class="text-gray-400 text-sm">Add a budget to track your spending</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (budget of budgets(); track budget.id) {
            @let percent = budget.limit > 0 ? (budget.spent / budget.limit * 100) : 0;
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-xl">{{ budget.category.icon || '&#9632;' }}</span>
                <h3 class="font-semibold text-gray-800">{{ budget.category.name }}</h3>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">Limit</span>
                  <span class="font-medium text-gray-700">{{ budget.limit | currency }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Spent</span>
                  <span class="font-medium" [class.text-green-600]="percent <= 100" [class.text-red-600]="percent > 100">
                    {{ budget.spent | currency }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Remaining</span>
                  <span class="font-medium" [class.text-green-600]="budget.limit - budget.spent >= 0" [class.text-red-600]="budget.limit - budget.spent < 0">
                    {{ (budget.limit - budget.spent) | currency }}
                  </span>
                </div>
              </div>
              <div class="mt-4">
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    class="h-2.5 rounded-full transition-all duration-300"
                    [style.width.%]="percent > 100 ? 100 : percent"
                    [class.bg-green-500]="percent < 80"
                    [class.bg-yellow-500]="percent >= 80 && percent <= 100"
                    [class.bg-red-500]="percent > 100"
                  ></div>
                </div>
                <p class="text-xs text-gray-400 mt-1">{{ percent.toFixed(1) }}% used</p>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class BudgetsComponent implements OnInit {
  private api = inject(ApiService);

  budgets = signal<Budget[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showAddForm = signal(false);
  formSubmitting = signal(false);
  formError = signal<string | null>(null);

  months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  formCategoryId: number | null = null;
  formMonth = new Date().getMonth() + 1;
  formYear = new Date().getFullYear();
  formLimit = 0;

  get expenseCategories() {
    return () => this.categories().filter((c) => c.type === 'expense');
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadBudgets();
  }

  loadCategories(): void {
    this.api.getCategories().subscribe({
      next: (res) => this.categories.set(res),
      error: () => {},
    });
  }

  loadBudgets(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getBudgetSummary().subscribe({
      next: (res) => {
        this.budgets.set(res as any);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load budgets');
        this.loading.set(false);
      },
    });
  }

  cancelForm(): void {
    this.showAddForm.set(false);
    this.resetForm();
  }

  resetForm(): void {
    this.formCategoryId = null;
    this.formMonth = new Date().getMonth() + 1;
    this.formYear = new Date().getFullYear();
    this.formLimit = 0;
    this.formError.set(null);
  }

  addBudget(): void {
    if (!this.formCategoryId) {
      this.formError.set('Please select a category.');
      return;
    }
    if (!this.formLimit || this.formLimit <= 0) {
      this.formError.set('Limit must be greater than 0.');
      return;
    }
    if (this.formMonth < 1 || this.formMonth > 12) {
      this.formError.set('Invalid month.');
      return;
    }
    if (this.formYear < 2020 || this.formYear > 2099) {
      this.formError.set('Invalid year.');
      return;
    }

    this.formSubmitting.set(true);
    this.formError.set(null);

    this.api
      .createBudget({
        categoryId: this.formCategoryId,
        month: this.formMonth,
        year: this.formYear,
        limit: this.formLimit,
      })
      .subscribe({
        next: () => {
          this.formSubmitting.set(false);
          this.showAddForm.set(false);
          this.resetForm();
          this.loadBudgets();
        },
        error: (err) => {
          this.formError.set(err.message || 'Failed to create budget');
          this.formSubmitting.set(false);
        },
      });
  }
}
