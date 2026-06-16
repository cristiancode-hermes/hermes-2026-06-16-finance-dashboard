import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { Account } from '../entities/account.entity';
import { Transaction } from '../entities/transaction.entity';
import { CreateAccountDto } from './dto/create-account.dto';

describe('AccountsService', () => {
  let service: AccountsService;
  let accountRepo: any;
  let transactionRepo: any;

  const mockAccount: any = {
    id: 1,
    name: 'Checking Account',
    type: 'checking',
    balance: 1000,
    currency: 'USD',
    userId: 1,
    createdAt: new Date(),
  };

  const mockAccountRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockTransactionRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getRepositoryToken(Account),
          useValue: mockAccountRepo,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepo,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    accountRepo = mockAccountRepo;
    transactionRepo = mockTransactionRepo;
  });

  describe('findAll', () => {
    it('should return all accounts without userId', async () => {
      accountRepo.find.mockResolvedValue([mockAccount]);
      const result = await service.findAll();
      expect(accountRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockAccount]);
    });

    it('should filter by userId when provided', async () => {
      accountRepo.find.mockResolvedValue([mockAccount]);
      const result = await service.findAll(1);
      expect(accountRepo.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockAccount]);
    });

    it('should return empty array when no accounts', async () => {
      accountRepo.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return an account with computed balance', async () => {
      accountRepo.findOne.mockResolvedValue(mockAccount);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ net: '500' }),
      };
      transactionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findOne(1);
      expect(accountRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ ...mockAccount, currentBalance: 1500 });
    });

    it('should return balance as base when no transactions', async () => {
      accountRepo.findOne.mockResolvedValue(mockAccount);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ net: '0' }),
      };
      transactionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findOne(1);
      expect(result.currentBalance).toBe(1000);
    });

    it('should throw NotFoundException when account not found', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new account', async () => {
      const dto: CreateAccountDto = {
        name: 'New Account',
        type: 'savings',
        balance: 500,
      };
      const created = { ...mockAccount, name: 'New Account', type: 'savings', balance: 500 };
      accountRepo.create.mockReturnValue(created);
      accountRepo.save.mockResolvedValue(created);

      const result = await service.create(dto, 1);
      expect(accountRepo.create).toHaveBeenCalledWith({
        name: 'New Account',
        type: 'savings',
        balance: 500,
        currency: 'USD',
        userId: 1,
      });
      expect(accountRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should set default balance to 0 when not provided', async () => {
      const dto: CreateAccountDto = {
        name: 'No Balance',
        type: 'cash',
      };
      const created = { ...mockAccount, name: 'No Balance', type: 'cash', balance: 0 };
      accountRepo.create.mockReturnValue(created);
      accountRepo.save.mockResolvedValue(created);

      await service.create(dto, 1);
      expect(accountRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ balance: 0 }),
      );
    });

    it('should set userId to null when not provided', async () => {
      const dto: CreateAccountDto = {
        name: 'Public Account',
        type: 'checking',
      };
      accountRepo.create.mockReturnValue(mockAccount);
      accountRepo.save.mockResolvedValue(mockAccount);
      await service.create(dto);
      expect(accountRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null }),
      );
    });
  });

  describe('update', () => {
    it('should update an existing account', async () => {
      const existing = { ...mockAccount };
      accountRepo.findOne.mockResolvedValue(existing);
      accountRepo.save.mockResolvedValue({ ...existing, name: 'Updated', balance: 2000 });

      const result = await service.update(1, { name: 'Updated', balance: 2000 });
      expect(accountRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(accountRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated');
      expect(result.balance).toBe(2000);
    });

    it('should update userId when provided', async () => {
      const existing = { ...mockAccount, userId: null };
      accountRepo.findOne.mockResolvedValue(existing);
      accountRepo.save.mockResolvedValue({ ...existing, userId: 2 });

      await service.update(1, { name: 'Updated' }, 2);
      expect(accountRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 2 }),
      );
    });

    it('should throw NotFoundException when updating non-existent account', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      await expect(service.update(999, { name: 'Nope' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should remove an account with no transactions', async () => {
      accountRepo.findOne.mockResolvedValue(mockAccount);
      transactionRepo.count.mockResolvedValue(0);
      accountRepo.remove.mockResolvedValue(mockAccount);

      await service.remove(1);
      expect(transactionRepo.count).toHaveBeenCalledWith({ where: { accountId: 1 } });
      expect(accountRepo.remove).toHaveBeenCalledWith(mockAccount);
    });

    it('should throw BadRequestException when account has transactions', async () => {
      accountRepo.findOne.mockResolvedValue(mockAccount);
      transactionRepo.count.mockResolvedValue(5);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
      expect(accountRepo.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when removing non-existent account', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
