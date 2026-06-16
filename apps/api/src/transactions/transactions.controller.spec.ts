import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let transactionsService: any;

  const mockTransactionsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    transactionsService = mockTransactionsService;
  });

  describe('findAll', () => {
    it('should call service.findAll with query and userId', async () => {
      const query: QueryTransactionDto = { accountId: 1 };
      const req = { user: { id: 1 } };
      const expected = [{ id: 1, amount: 100 }];
      transactionsService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(query, req);
      expect(transactionsService.findAll).toHaveBeenCalledWith(query, 1);
      expect(result).toEqual(expected);
    });

    it('should handle empty query', async () => {
      const query: QueryTransactionDto = {};
      const req = { user: { id: 1 } };
      transactionsService.findAll.mockResolvedValue([]);

      await controller.findAll(query, req);
      expect(transactionsService.findAll).toHaveBeenCalledWith(query, 1);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      const expected = { id: 1, amount: 100 };
      transactionsService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(1);
      expect(transactionsService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });
  });

  describe('create', () => {
    it('should call service.create with dto and userId', async () => {
      const dto: CreateTransactionDto = {
        amount: 200,
        description: 'Test',
        date: '2026-06-16',
        type: 'expense',
        accountId: 1,
        categoryId: 1,
      };
      const req = { user: { id: 1 } };
      const expected = { id: 2, amount: 200 };
      transactionsService.create.mockResolvedValue(expected);

      const result = await controller.create(dto, req);
      expect(transactionsService.create).toHaveBeenCalledWith(dto, 1);
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto and userId', async () => {
      const dto: CreateTransactionDto = {
        amount: 300,
        description: 'Updated',
        date: '2026-06-16',
        type: 'expense',
        accountId: 1,
        categoryId: 1,
      };
      const req = { user: { id: 1 } };
      const expected = { id: 1, amount: 300 };
      transactionsService.update.mockResolvedValue(expected);

      const result = await controller.update(1, dto, req);
      expect(transactionsService.update).toHaveBeenCalledWith(1, dto, 1);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', async () => {
      transactionsService.remove.mockResolvedValue(undefined);
      await controller.remove(1);
      expect(transactionsService.remove).toHaveBeenCalledWith(1);
    });
  });
});
