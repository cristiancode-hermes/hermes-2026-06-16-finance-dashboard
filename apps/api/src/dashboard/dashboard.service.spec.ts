import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { Account } from '../entities/account.entity';
import { Transaction } from '../entities/transaction.entity';
import { Budget } from '../entities/budget.entity';

describe('DashboardService', () => {
  let service: DashboardService;
  let accountRepo: any;
  let transactionRepo: any;
  let budgetRepo: any;

  const mockAccount = { id: 1, name: 'Checking', type: 'checking', balance: 5000, currency: 'USD', userId: 1, createdAt: new Date() };
  const mockCategory = { id: 1, name: 'Food', type: 'expense', icon: '🍕', color: '#ff0000', userId: 1, createdAt: new Date() };
  const mockTransaction = {
    id: 1, amount: 100, description: 'Test', date: new Date(), type: 'expense',
    accountId: 1, categoryId: 1, userId: 1,
    account: mockAccount, category: mockCategory, createdAt: new Date(),
  };
  const mockBudget = {
    id: 1, categoryId: 1, category: mockCategory,
    month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    limit: 500, spent: 0, userId: 1, createdAt: new Date(),
  };

  const mockAccountRepo = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };
  const mockTransactionRepo = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };
  const mockBudgetRepo = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Account), useValue: mockAccountRepo },
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionRepo },
        { provide: getRepositoryToken(Budget), useValue: mockBudgetRepo },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    accountRepo = mockAccountRepo;
    transactionRepo = mockTransactionRepo;
    budgetRepo = mockBudgetRepo;
  });

  describe('getSummary', () => {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return dashboard summary with all metrics', async () => {
      // Mock balance query
      const mockBalanceQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '10000' }),
      };
      accountRepo.createQueryBuilder.mockReturnValue(mockBalanceQb);

      // Mock monthly income query
      const mockIncomeQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '5000' }),
      };
      // Mock monthly expenses query
      const mockExpenseQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '2000' }),
      };
      // Mock budget actual query
      const mockBudgetQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '150' }),
      };

      transactionRepo.createQueryBuilder
        .mockReturnValueOnce(mockIncomeQb)
        .mockReturnValueOnce(mockExpenseQb)
        .mockReturnValueOnce(mockBudgetQb);

      // Mock recent transactions
      transactionRepo.find.mockResolvedValue([mockTransaction]);

      // Mock budgets
      budgetRepo.find.mockResolvedValue([mockBudget]);

      const result = await service.getSummary(1);

      expect(result).toHaveProperty('totalBalance', 10000);
      expect(result).toHaveProperty('monthlyIncome', 5000);
      expect(result).toHaveProperty('monthlyExpenses', 2000);
      expect(result).toHaveProperty('recentTransactions');
      expect(result.recentTransactions).toHaveLength(1);
      expect(result).toHaveProperty('budgetStatus');
      expect(result.budgetStatus).toHaveLength(1);
      expect(result.budgetStatus[0]).toHaveProperty('actual', 150);
      expect(result.budgetStatus[0]).toHaveProperty('remaining', 350);
      expect(result.budgetStatus[0]).toHaveProperty('percentage', 30);
    });

    it('should handle no userId by querying all data', async () => {
      const mockBalanceQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '50000' }),
      };
      accountRepo.createQueryBuilder.mockReturnValue(mockBalanceQb);

      const mockIncomeQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '10000' }),
      };
      const mockExpenseQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '3000' }),
      };

      transactionRepo.createQueryBuilder
        .mockReturnValueOnce(mockIncomeQb)
        .mockReturnValueOnce(mockExpenseQb);

      transactionRepo.find.mockResolvedValue([]);
      budgetRepo.find.mockResolvedValue([]);

      const result = await service.getSummary();

      expect(result.totalBalance).toBe(50000);
      expect(result.monthlyIncome).toBe(10000);
      expect(result.monthlyExpenses).toBe(3000);
      expect(result.recentTransactions).toEqual([]);
      expect(result.budgetStatus).toEqual([]);
    });

    it('should handle zero balance and zero transactions', async () => {
      const mockBalanceQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      };
      accountRepo.createQueryBuilder.mockReturnValue(mockBalanceQb);

      const mockIncomeQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };
      const mockExpenseQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };

      transactionRepo.createQueryBuilder
        .mockReturnValueOnce(mockIncomeQb)
        .mockReturnValueOnce(mockExpenseQb);

      transactionRepo.find.mockResolvedValue([]);
      budgetRepo.find.mockResolvedValue([]);

      const result = await service.getSummary(1);

      expect(result.totalBalance).toBe(0);
      expect(result.monthlyIncome).toBe(0);
      expect(result.monthlyExpenses).toBe(0);
    });

    it('should calculate budget percentage correctly for zero limit', async () => {
      const zeroLimitBudget = { ...mockBudget, limit: 0 };

      const mockBalanceQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '5000' }),
      };
      accountRepo.createQueryBuilder.mockReturnValue(mockBalanceQb);

      const mockIncomeQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '3000' }),
      };
      const mockExpenseQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '1500' }),
      };
      const mockBudgetQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      };

      transactionRepo.createQueryBuilder
        .mockReturnValueOnce(mockIncomeQb)
        .mockReturnValueOnce(mockExpenseQb)
        .mockReturnValueOnce(mockBudgetQb);

      transactionRepo.find.mockResolvedValue([]);
      budgetRepo.find.mockResolvedValue([zeroLimitBudget]);

      const result = await service.getSummary(1);

      expect(result.budgetStatus[0].percentage).toBe(0);
      expect(result.budgetStatus[0].actual).toBe(0);
    });
  });
});
