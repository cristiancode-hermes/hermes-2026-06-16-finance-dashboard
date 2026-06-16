import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository, Between } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repo: any;

  const mockTransaction: any = {
    id: 1,
    amount: 100,
    description: 'Test transaction',
    date: new Date('2026-06-16'),
    type: 'expense',
    accountId: 1,
    categoryId: 2,
    userId: 1,
    account: { id: 1, name: 'Checking', type: 'checking', balance: 500, currency: 'USD', userId: 1, createdAt: new Date() },
    category: { id: 2, name: 'Food', type: 'expense', icon: '🍕', color: '#ff0000', userId: 1, createdAt: new Date() },
    createdAt: new Date(),
  };

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    repo = mockRepo;
  });

  describe('findAll', () => {
    it('should return all transactions without filters', async () => {
      repo.find.mockResolvedValue([mockTransaction]);
      const result = await service.findAll({});
      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        relations: { account: true, category: true },
        order: { date: 'DESC' },
      });
      expect(result).toEqual([mockTransaction]);
    });

    it('should filter by userId when provided', async () => {
      repo.find.mockResolvedValue([mockTransaction]);
      await service.findAll({}, 1);
      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: { account: true, category: true },
        order: { date: 'DESC' },
      });
    });

    it('should filter by accountId', async () => {
      repo.find.mockResolvedValue([mockTransaction]);
      const query: QueryTransactionDto = { accountId: 1 };
      await service.findAll(query);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ accountId: 1 }),
        }),
      );
    });

    it('should filter by date range', async () => {
      repo.find.mockResolvedValue([mockTransaction]);
      const query: QueryTransactionDto = {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      };
      await service.findAll(query);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: Between(new Date('2026-06-01'), new Date('2026-06-30')),
          }),
        }),
      );
    });

    it('should return empty array when no transactions', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.findAll({});
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id', async () => {
      repo.findOne.mockResolvedValue(mockTransaction);
      const result = await service.findOne(1);
      expect(result).toEqual(mockTransaction);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new transaction', async () => {
      const dto: CreateTransactionDto = {
        amount: 200,
        description: 'New transaction',
        date: '2026-06-16',
        type: 'expense',
        accountId: 1,
        categoryId: 2,
      };
      const created = { ...mockTransaction, amount: 200, description: 'New transaction' };
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.create(dto, 1);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 200,
          description: 'New transaction',
          type: 'expense',
          userId: 1,
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should handle income transactions', async () => {
      const dto: CreateTransactionDto = {
        amount: 5000,
        description: 'Salary',
        date: '2026-06-01',
        type: 'income',
        accountId: 1,
        categoryId: 1,
      };
      repo.create.mockReturnValue(mockTransaction);
      repo.save.mockResolvedValue(mockTransaction);
      await service.create(dto, 1);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'income' }),
      );
    });
  });

  describe('remove', () => {
    it('should remove a transaction by id', async () => {
      repo.findOne.mockResolvedValue(mockTransaction);
      repo.remove.mockResolvedValue(mockTransaction);
      await service.remove(1);
      expect(repo.remove).toHaveBeenCalledWith(mockTransaction);
    });

    it('should throw NotFoundException when removing non-existent transaction', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
