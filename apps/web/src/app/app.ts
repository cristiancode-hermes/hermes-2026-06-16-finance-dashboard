import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="bg-gray-900 text-white p-4 shadow-md">
      <div class="container mx-auto flex items-center justify-between">
        <a class="text-xl font-bold" routerLink="/">Finance Dashboard</a>
        <div class="flex gap-4">
          <a routerLink="/dashboard" routerLinkActive="font-bold underline" class="hover:text-blue-300 transition">Dashboard</a>
          <a routerLink="/transactions" routerLinkActive="font-bold underline" class="hover:text-blue-300 transition">Transactions</a>
          <a routerLink="/budgets" routerLinkActive="font-bold underline" class="hover:text-blue-300 transition">Budgets</a>
          <a routerLink="/reports" routerLinkActive="font-bold underline" class="hover:text-blue-300 transition">Reports</a>
        </div>
      </div>
    </nav>
    <main class="container mx-auto p-4">
      <router-outlet />
    </main>
  `,
  styles: [],
})
export class App {
}
