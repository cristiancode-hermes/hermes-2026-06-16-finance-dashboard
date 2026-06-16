import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ApiService, Transaction } from '../services/api.service';

interface CategoryAggregate {
  name: string;
  icon: string;
  total: number;
  type: 'income' | 'expense';
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="p-4">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">Reports</h2>

      @if (loading()) {
        <div class="space-y-6 animate-pulse">
          <div class="bg-gray-200 rounded-xl h-40"></div>
          <div class="bg-gray-200 rounded-xl h-48"></div>
          <div class="bg-gray-200 rounded-xl h-32"></div>
        </div>
      } @else if (error()) {
        <div class="text-center py-16">
          <div class="text-red-500 text-5xl mb-4">&#9888;</div>
          <p class="text-gray-600 mb-4">{{ error() }}</p>
          <button
            (click)="loadData()"
            class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      } @else if (allTransactions().length === 0) {
        <div class="text-center py-16">
          <div class="text-gray-400 text-5xl mb-4">&#128202;</div>
          <p class="text-gray-500 mb-2">No data for this month</p>
          <p class="text-gray-400 text-sm">Add some transactions to see reports</p>
        </div>
      } @else {
        <!-- Income vs Expenses Comparison -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Income vs Expenses (This Month)</h3>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium text-green-600">Income</span>
                <span class="font-medium text-gray-700">{{ totalIncome() | currency }}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-6">
                <div
                  class="bg-green-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  [style.width.%]="incomePercent()"
                >
                  @if (totalIncome() > 0) {
                    <span class="text-xs text-white font-medium">{{ incomePercent() }}%</span>
                  }
                </div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium text-red-600">Expenses</span>
                <span class="font-medium text-gray-700">{{ totalExpenses() | currency }}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-6">
                <div
                  class="bg-red-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  [style.width.%]="expensePercent()"
                >
                  @if (totalExpenses() > 0) {
                    <span class="text-xs text-white font-medium">{{ expensePercent() }}%</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Category Breakdown -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Category Breakdown</h3>
          @if (categoryTotals().length === 0) {
            <p class="text-gray-500 text-center py-4">No categorized transactions this month</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="border-b border-gray-100 text-sm text-gray-500">
                    <th class="pb-3 font-medium">Category</th>
                    <th class="pb-3 font-medium">Type</th>
                    <th class="pb-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (cat of categoryTotals(); track cat.name) {
                    <tr class="border-b border-gray-50 hover:bg-gray-50">
                      <td class="py-3">
                        <span class="inline-flex items-center gap-2">
                          <span>{{ cat.icon || '&#9632;' }}</span>
                          <span class="text-sm text-gray-700">{{ cat.name }}</span>
                        </span>
                      </td>
                      <td class="py-3">
                        <span
                          class="text-xs px-2 py-0.5 rounded-full font-medium"
                          [class.bg-green-100]="cat.type === 'income'"
                          [class.text-green-700]="cat.type === 'income'"
                          [class.bg-red-100]="cat.type === 'expense'"
                          [class.text-red-700]="cat.type === 'expense'"
                        >
                          {{ cat.type }}
                        </span>
                      </td>
                      <td class="py-3 text-sm font-medium text-right"
                        [class.text-green-600]="cat.type === 'income'"
                        [class.text-red-600]="cat.type === 'expense'"
                      >
                        {{ cat.type === 'income' ? '+' : '-' }}{{ cat.total | currency }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Monthly Summary -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Monthly Summary</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div class="bg-green-50 rounded-xl p-4">
              <p class="text-sm text-green-600 font-medium mb-1">Total Income</p>
              <p class="text-xl font-bold text-green-700">{{ totalIncome() | currency }}</p>
            </div>
            <div class="bg-red-50 rounded-xl p-4">
              <p class="text-sm text-red-600 font-medium mb-1">Total Expenses</p>
              <p class="text-xl font-bold text-red-700">{{ totalExpenses() | currency }}</p>
            </div>
            <div class="bg-blue-50 rounded-xl p-4">
              <p class="text-sm text-blue-600 font-medium mb-1">Net</p>
              <p class="text-xl font-bold" [class.text-green-700]="netAmount() >= 0" [class.text-red-700]="netAmount() < 0">
                {{ netAmount() >= 0 ? '+' : '' }}{{ netAmount() | currency }}
              </p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ReportsComponent implements OnInit {
  private api = inject(ApiService);

  allTransactions = signal<Transaction[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  totalIncome = computed(() =>
    this.allTransactions()
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  totalExpenses = computed(() =>
    this.allTransactions()
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  netAmount = computed(() => this.totalIncome() - this.totalExpenses());

  maxVal = computed(() => Math.max(this.totalIncome(), this.totalExpenses(), 1));

  incomePercent = computed(() =>
    Math.round((this.totalIncome() / this.maxVal()) * 100)
  );

  expensePercent = computed(() =>
    Math.round((this.totalExpenses() / this.maxVal()) * 100)
  );

  categoryTotals = computed<CategoryAggregate[]>(() => {
    const map = new Map<string, CategoryAggregate>();
    for (const tx of this.allTransactions()) {
      const key = tx.category.name;
      const existing = map.get(key);
      if (existing) {
        existing.total += tx.amount;
      } else {
        map.set(key, {
          name: key,
          icon: tx.category.icon || '',
          total: tx.amount,
          type: tx.type,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    this.api
      .getTransactions({ startDate, endDate })
      .subscribe({
        next: (res) => {
          this.allTransactions.set(res);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message || 'Failed to load report data');
          this.loading.set(false);
        },
      });
  }
}
