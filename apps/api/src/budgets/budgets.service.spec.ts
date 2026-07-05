import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { Budget } from '../entities/budget.entity';
import { Transaction } from '../entities/transaction.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let budgetRepo: any;
  let transactionRepo: any;

  const mockCategory = {
    id: 1,
    name: 'Food',
    type: 'expense' as const,
    icon: '🍕',
    color: '#ff0000',
    userId: null,
    createdAt: new Date(),
  };

  const mockBudget: any = {
    id: 1,
    categoryId: 1,
    category: mockCategory,
    month: 6,
    year: 2026,
    limit: 500,
    spent: 0,
    userId: 1,
    createdAt: new Date(),
  };

  const mockBudgetRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockTransactionRepo = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        {
          provide: getRepositoryToken(Budget),
          useValue: mockBudgetRepo,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepo,
        },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    budgetRepo = mockBudgetRepo;
    transactionRepo = mockTransactionRepo;
  });

  describe('findAll', () => {
    it('should return all budgets for a user', async () => {
      budgetRepo.find.mockResolvedValue([mockBudget]);
      const result = await service.findAll(1);
      expect(budgetRepo.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: { category: true },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockBudget]);
    });

    it('should return empty array when no budgets', async () => {
      budgetRepo.find.mockResolvedValue([]);
      const result = await service.findAll(1);
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a budget by id', async () => {
      budgetRepo.findOne.mockResolvedValue(mockBudget);
      const result = await service.findOne(1);
      expect(result).toEqual(mockBudget);
    });

    it('should throw NotFoundException when budget not found', async () => {
      budgetRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new budget', async () => {
      const dto: CreateBudgetDto = {
        categoryId: 1,
        month: 6,
        year: 2026,
        limit: 500,
      };
      const created = { ...mockBudget };
      budgetRepo.create.mockReturnValue(created);
      budgetRepo.save.mockResolvedValue(created);

      const result = await service.create(dto, 1);
      expect(budgetRepo.create).toHaveBeenCalledWith({
        ...dto,
        spent: 0,
        userId: 1,
      });
      expect(budgetRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should set userId to null when not provided', async () => {
      const dto: CreateBudgetDto = {
        categoryId: 1,
        month: 6,
        year: 2026,
        limit: 300,
      };
      budgetRepo.create.mockReturnValue(mockBudget);
      budgetRepo.save.mockResolvedValue(mockBudget);
      await service.create(dto);
      expect(budgetRepo.create).toHaveBeenCalledWith({
        ...dto,
        spent: 0,
        userId: null,
      });
    });
  });

  describe('remove', () => {
    it('should remove a budget by id', async () => {
      budgetRepo.findOne.mockResolvedValue(mockBudget);
      budgetRepo.remove.mockResolvedValue(mockBudget);
      await service.remove(1);
      expect(budgetRepo.remove).toHaveBeenCalledWith(mockBudget);
    });

    it('should throw NotFoundException when removing non-existent budget', async () => {
      budgetRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSummary', () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    it('should return budget summaries with actual spending', async () => {
      budgetRepo.find.mockResolvedValue([mockBudget]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '250' }),
      };

      transactionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getSummary(1);

      expect(budgetRepo.find).toHaveBeenCalledWith({
        where: { month: currentMonth, year: currentYear, userId: 1 },
        relations: { category: true },
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        category: mockCategory,
        limit: 500,
        actual: 250,
        remaining: 250,
        percentage: 50,
        month: mockBudget.month,
        year: mockBudget.year,
      });
    });

    it('should handle zero limit budgets', async () => {
      const zeroLimitBudget = { ...mockBudget, limit: 0 };
      budgetRepo.find.mockResolvedValue([zeroLimitBudget]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      };

      transactionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getSummary(1);
      expect(result[0].percentage).toBe(0);
    });

    it('should handle budgets over limit', async () => {
      budgetRepo.find.mockResolvedValue([mockBudget]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '600' }),
      };

      transactionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getSummary(1);
      expect(result[0].actual).toBe(600);
      expect(result[0].remaining).toBe(-100);
      expect(result[0].percentage).toBe(120);
    });
  });
});
