import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = mockAuthService;
  });

  describe('register', () => {
    it('should call authService.register with dto and return result', async () => {
      const dto: RegisterDto = { email: 'test@example.com', password: 'password123', name: 'Test' };
      const expected = { token: 'jwt', user: { id: 1, email: 'test@example.com', name: 'Test' } };
      authService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });

    it('should propagate service errors', async () => {
      const dto: RegisterDto = { email: 'existing@example.com', password: 'pwd', name: 'Test' };
      authService.register.mockRejectedValue(new Error('Conflict'));

      await expect(controller.register(dto)).rejects.toThrow('Conflict');
    });
  });

  describe('login', () => {
    it('should call authService.login with dto and return result', async () => {
      const dto: LoginDto = { email: 'test@example.com', password: 'password123' };
      const expected = { token: 'jwt', user: { id: 1, email: 'test@example.com' } };
      authService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });

    it('should propagate service errors', async () => {
      const dto: LoginDto = { email: 'bad@example.com', password: 'wrong' };
      authService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(dto)).rejects.toThrow('Invalid credentials');
    });
  });
});
