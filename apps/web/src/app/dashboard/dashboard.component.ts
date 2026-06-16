import { Component, signal, inject, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ApiService, DashboardSummary } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <div class="p-4">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">Dashboard</h2>

      @if (loading()) {
        <!-- Loading Skeleton -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-pulse">
          @for (i of [1,2,3,4]; track i) {
            <div class="bg-gray-200 rounded-xl p-6 h-28"></div>
          }
        </div>
        <div class="bg-gray-200 rounded-xl p-6 h-64 animate-pulse mb-8"></div>
        <div class="bg-gray-200 rounded-xl p-6 h-48 animate-pulse"></div>
      } @else if (error()) {
        <!-- Error State -->
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
      } @else if (data()) {
        @let d = data()!;
        <!-- Stat Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500 mb-1">Total Balance</p>
            <p class="text-2xl font-bold text-gray-800">{{ d.totalBalance | currency }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500 mb-1">Monthly Income</p>
            <p class="text-2xl font-bold text-green-600">{{ d.monthlyIncome | currency }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500 mb-1">Monthly Expenses</p>
            <p class="text-2xl font-bold text-red-600">{{ d.monthlyExpenses | currency }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500 mb-1">Net Change</p>
            <p class="text-2xl font-bold" [class.text-green-600]="netChange() >= 0" [class.text-red-600]="netChange() < 0">
              {{ netChange() >= 0 ? '+' : '' }}{{ netChange() | currency }}
            </p>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Transactions</h3>
          @if (d.recentTransactions.length === 0) {
            <p class="text-gray-500 text-center py-4">No recent transactions</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="border-b border-gray-100 text-sm text-gray-500">
                    <th class="pb-3 font-medium">Date</th>
                    <th class="pb-3 font-medium">Category</th>
                    <th class="pb-3 font-medium">Description</th>
                    <th class="pb-3 font-medium">Account</th>
                    <th class="pb-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  @for (tx of d.recentTransactions; track tx.id) {
                    <tr class="border-b border-gray-50 hover:bg-gray-50">
                      <td class="py-3 text-sm text-gray-600">{{ tx.date | date:'MMM dd, yyyy' }}</td>
                      <td class="py-3">
                        <span class="inline-flex items-center gap-1">
                          <span>{{ tx.category.icon || '&#9632;' }}</span>
                          <span class="text-sm text-gray-700">{{ tx.category.name }}</span>
                        </span>
                      </td>
                      <td class="py-3 text-sm text-gray-600">{{ tx.description }}</td>
                      <td class="py-3 text-sm text-gray-600">{{ tx.account.name }}</td>
                      <td class="py-3 text-sm font-medium text-right"
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
          }
        </div>

        <!-- Budget Status -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Budget Status</h3>
          @if (d.budgetStatus.length === 0) {
            <p class="text-gray-500 text-center py-4">No budgets set up</p>
          } @else {
            <div class="space-y-4">
              @for (budget of d.budgetStatus; track budget.id) {
                @let percent = budget.limit > 0 ? (budget.spent / budget.limit * 100) : 0;
                <div>
                  <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-medium text-gray-700">
                      {{ budget.category.icon }} {{ budget.category.name }}
                    </span>
                    <span class="text-sm text-gray-500">
                      {{ budget.spent | currency }} / {{ budget.limit | currency }}
                    </span>
                  </div>
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
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);

  data = signal<DashboardSummary | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  netChange = () => (this.data()?.monthlyIncome ?? 0) - (this.data()?.monthlyExpenses ?? 0);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getDashboardSummary().subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load dashboard data');
        this.loading.set(false);
      },
    });
  }
}
