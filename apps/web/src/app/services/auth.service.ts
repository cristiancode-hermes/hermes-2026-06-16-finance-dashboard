import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  login(email: string, password: string): Observable<{ access_token: string }> {
    return this.api.login(email, password).pipe(
      tap((res) => {
        localStorage.setItem('token', res.access_token);
      })
    );
  }

  register(email: string, password: string, name: string): Observable<{ access_token: string }> {
    return this.api.register(email, password, name).pipe(
      tap((res) => {
        localStorage.setItem('token', res.access_token);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
