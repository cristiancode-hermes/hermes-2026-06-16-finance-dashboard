import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';

describe('BudgetsController', () => {
  let controller: BudgetsController;
  let budgetsService: any;

  const mockBudgetsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetsController],
      providers: [
        {
          provide: BudgetsService,
          useValue: mockBudgetsService,
        },
      ],
    }).compile();

    controller = module.get<BudgetsController>(BudgetsController);
    budgetsService = mockBudgetsService;
  });

  describe('findAll', () => {
    it('should call service.findAll with userId from req', async () => {
      const req = { user: { id: 1 } };
      const expected = [{ id: 1, limit: 500 }];
      budgetsService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(req);
      expect(budgetsService.findAll).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });
  });

  describe('getSummary', () => {
    it('should call service.getSummary with userId from req', async () => {
      const req = { user: { id: 1 } };
      const expected = [{ id: 1, actual: 100, limit: 500 }];
      budgetsService.getSummary.mockResolvedValue(expected);

      const result = await controller.getSummary(req);
      expect(budgetsService.getSummary).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      const expected = { id: 1, limit: 500 };
      budgetsService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(1);
      expect(budgetsService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });
  });

  describe('create', () => {
    it('should call service.create with dto and userId', async () => {
      const dto: CreateBudgetDto = { categoryId: 1, month: 6, year: 2026, limit: 500 };
      const req = { user: { id: 1 } };
      const expected = { id: 1, limit: 500 };
      budgetsService.create.mockResolvedValue(expected);

      const result = await controller.create(dto, req);
      expect(budgetsService.create).toHaveBeenCalledWith(dto, 1);
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto and userId', async () => {
      const dto: CreateBudgetDto = { categoryId: 1, month: 6, year: 2026, limit: 600 };
      const req = { user: { id: 1 } };
      const expected = { id: 1, limit: 600 };
      budgetsService.update.mockResolvedValue(expected);

      const result = await controller.update(1, dto, req);
      expect(budgetsService.update).toHaveBeenCalledWith(1, dto, 1);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', async () => {
      budgetsService.remove.mockResolvedValue(undefined);
      await controller.remove(1);
      expect(budgetsService.remove).toHaveBeenCalledWith(1);
    });
  });
});
