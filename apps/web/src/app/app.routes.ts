import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'transactions',
    loadComponent: () => import('./transactions/transactions.component').then((m) => m.TransactionsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'budgets',
    loadComponent: () => import('./budgets/budgets.component').then((m) => m.BudgetsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component').then((m) => m.ReportsComponent),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
