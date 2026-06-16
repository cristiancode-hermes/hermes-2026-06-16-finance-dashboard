import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';
import { SeedService } from './seed.service';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Account } from '../entities/account.entity';
import { Transaction } from '../entities/transaction.entity';
import { Budget } from '../entities/budget.entity';

describe('SeedService', () => {
  let service: SeedService;
  let userRepo: any;
  let categoryRepo: any;
  let accountRepo: any;
  let transactionRepo: any;
  let budgetRepo: any;

  const mockUser = {
    id: 1,
    email: 'demo@example.com',
    name: 'Demo User',
    password: crypto.createHash('sha256').update('password123').digest('hex'),
    createdAt: new Date(),
  };

  const mockRepos = {
    userRepo: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
    categoryRepo: {
      create: jest.fn(),
      save: jest.fn(),
    },
    accountRepo: {
      create: jest.fn(),
      save: jest.fn(),
    },
    transactionRepo: {
      create: jest.fn(),
      save: jest.fn(),
    },
    budgetRepo: {
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: getRepositoryToken(User), useValue: mockRepos.userRepo },
        { provide: getRepositoryToken(Category), useValue: mockRepos.categoryRepo },
        { provide: getRepositoryToken(Account), useValue: mockRepos.accountRepo },
        { provide: getRepositoryToken(Transaction), useValue: mockRepos.transactionRepo },
        { provide: getRepositoryToken(Budget), useValue: mockRepos.budgetRepo },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
    userRepo = mockRepos.userRepo;
    categoryRepo = mockRepos.categoryRepo;
    accountRepo = mockRepos.accountRepo;
    transactionRepo = mockRepos.transactionRepo;
    budgetRepo = mockRepos.budgetRepo;
  });

  describe('seed', () => {
    it('should seed demo data successfully', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);

      // Categories
      categoryRepo.create.mockImplementation((data: any) => ({ id: Math.random(), ...data }));
      categoryRepo.save.mockImplementation((data: any) => Promise.resolve({ ...data, id: Math.floor(Math.random() * 100) }));

      // Accounts
      accountRepo.create.mockImplementation((data: any) => ({ id: Math.random(), ...data }));
      accountRepo.save.mockImplementation((data: any) => Promise.resolve({ ...data, id: Math.floor(Math.random() * 100) }));

      // Transactions
      transactionRepo.create.mockImplementation((data: any) => ({ id: Math.random(), ...data }));
      transactionRepo.save.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      // Budgets
      budgetRepo.create.mockImplementation((data: any) => ({ id: Math.random(), ...data }));
      budgetRepo.save.mockImplementation((data: any) => Promise.resolve({ ...data, id: Math.floor(Math.random() * 100) }));

      const result = await service.seed();

      expect(result).toHaveProperty('message', 'Demo data seeded successfully');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('categories', 6);
      expect(result).toHaveProperty('accounts', 3);
      expect(result).toHaveProperty('transactions', 20);
      expect(result).toHaveProperty('budgets', 4);

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { email: 'demo@example.com' } });
      expect(userRepo.create).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('should throw HttpException when demo data already seeded', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      await expect(service.seed()).rejects.toThrow(HttpException);
      await expect(service.seed()).rejects.toThrow(
        'Demo data already seeded. Delete the database file to re-seed.',
      );
    });

    it('should create user with hashed password', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);

      categoryRepo.create.mockReturnValue({});
      categoryRepo.save.mockImplementation((data: any) => Promise.resolve({ ...data, id: 1 }));
      accountRepo.create.mockReturnValue({});
      accountRepo.save.mockImplementation((data: any) => Promise.resolve({ ...data, id: 1 }));
      transactionRepo.create.mockReturnValue({});
      transactionRepo.save.mockResolvedValue([{ id: 1 }]);
      budgetRepo.create.mockReturnValue({});
      budgetRepo.save.mockImplementation((data: any) => Promise.resolve({ ...data, id: 1 }));

      await service.seed();

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'demo@example.com',
          name: 'Demo User',
        }),
      );
    });
  });
});
