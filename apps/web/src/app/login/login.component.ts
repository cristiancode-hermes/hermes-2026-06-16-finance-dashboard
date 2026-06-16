import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center">
      <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-100">
        @if (isRegisterMode()) {
          <h2 class="text-3xl font-bold text-center mb-2 text-gray-800">Create Account</h2>
          <p class="text-center text-gray-500 mb-6">Sign up to get started</p>
        } @else {
          <h2 class="text-3xl font-bold text-center mb-2 text-gray-800">Welcome Back</h2>
          <p class="text-center text-gray-500 mb-6">Sign in to your account</p>
        }

        @if (error()) {
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {{ error() }}
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          @if (isRegisterMode()) {
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="name">Name</label>
              <input
                id="name"
                type="text"
                [(ngModel)]="name"
                name="name"
                required
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Your full name"
              />
            </div>
          }

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="email">Email</label>
            <input
              id="email"
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1" for="password">Password</label>
            <input
              id="password"
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;"
            />
          </div>

          @if (isRegisterMode()) {
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                required
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;&#xb7;"
              />
            </div>
          }

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            @if (loading()) {
              <span class="inline-block animate-spin mr-2">&#9696;</span>
            }
            {{ isRegisterMode() ? 'Create Account' : 'Sign In' }}
          </button>
        </form>

        <div class="mt-6 text-center text-sm text-gray-500">
          @if (isRegisterMode()) {
            Already have an account?
            <button (click)="toggleMode()" class="text-blue-600 hover:underline font-medium ml-1">
              Sign in
            </button>
          } @else {
            Don't have an account?
            <button (click)="toggleMode()" class="text-blue-600 hover:underline font-medium ml-1">
              Register
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  name = '';
  confirmPassword = '';
  error = signal<string | null>(null);
  loading = signal(false);
  isRegisterMode = signal(false);

  toggleMode(): void {
    this.isRegisterMode.update((v) => !v);
    this.error.set(null);
    this.email = '';
    this.password = '';
    this.name = '';
    this.confirmPassword = '';
  }

  onSubmit(): void {
    this.error.set(null);

    if (!this.email || !this.password) {
      this.error.set('Email and password are required.');
      return;
    }

    if (this.isRegisterMode()) {
      if (this.password !== this.confirmPassword) {
        this.error.set('Passwords do not match.');
        return;
      }
      if (!this.name) {
        this.error.set('Name is required.');
        return;
      }
    }

    this.loading.set(true);

    if (this.isRegisterMode()) {
      this.authService.register(this.email, this.password, this.name).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.error.set(err.message || 'Registration failed. Please try again.');
          this.loading.set(false);
        },
      });
    } else {
      this.authService.login(this.email, this.password).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.error.set(err.message || 'Login failed. Please try again.');
          this.loading.set(false);
        },
      });
    }
  }
}
