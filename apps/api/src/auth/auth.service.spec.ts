import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: any;
  let jwtService: any;

  const hashedPassword = crypto.createHash('sha256').update('password123').digest('hex');

  const mockUser: any = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    password: hashedPassword,
    createdAt: new Date(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = mockUserRepo;
    jwtService = mockJwtService;
  });

  describe('register', () => {
    it('should register a new user and return JWT', async () => {
      const dto: RegisterDto = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };

      const newUser = {
        id: 2,
        email: 'new@example.com',
        name: 'New User',
        password: hashedPassword,
        createdAt: new Date(),
      };

      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(newUser);
      userRepo.save.mockResolvedValue(newUser);

      const result = await service.register(dto);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
      });
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          name: 'New User',
        }),
      );
      expect(userRepo.save).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 2, email: 'new@example.com' }),
      );
      expect(result).toHaveProperty('token', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
    });

    it('should throw ConflictException when email already exists', async () => {
      const dto: RegisterDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing',
      };

      userRepo.findOne.mockResolvedValue(mockUser);
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return JWT for valid credentials', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('token', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
