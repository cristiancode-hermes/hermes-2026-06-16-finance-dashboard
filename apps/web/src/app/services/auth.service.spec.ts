import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['login', 'register']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: apiSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  describe('login', () => {
    it('should call api.login and store token', () => {
      const mockResponse = { access_token: 'test-token' };
      apiSpy.login.and.returnValue(of(mockResponse));

      service.login('test@example.com', 'password123').subscribe((res) => {
        expect(apiSpy.login).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(localStorage.getItem('token')).toBe('test-token');
        expect(res).toEqual(mockResponse);
      });
    });
  });

  describe('register', () => {
    it('should call api.register and store token', () => {
      const mockResponse = { access_token: 'reg-token' };
      apiSpy.register.and.returnValue(of(mockResponse));

      service.register('new@example.com', 'password123', 'New User').subscribe((res) => {
        expect(apiSpy.register).toHaveBeenCalledWith('new@example.com', 'password123', 'New User');
        expect(localStorage.getItem('token')).toBe('reg-token');
        expect(res).toEqual(mockResponse);
      });
    });
  });

  describe('logout', () => {
    it('should remove token and navigate to login', () => {
      localStorage.setItem('token', 'some-token');
      service.logout();
      expect(localStorage.getItem('token')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('token', 'some-token');
      expect(service.isLoggedIn()).toBe(true);
    });

    it('should return false when no token', () => {
      expect(service.isLoggedIn()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return the stored token', () => {
      localStorage.setItem('token', 'my-token');
      expect(service.getToken()).toBe('my-token');
    });

    it('should return null when no token stored', () => {
      expect(service.getToken()).toBeNull();
    });
  });
});
