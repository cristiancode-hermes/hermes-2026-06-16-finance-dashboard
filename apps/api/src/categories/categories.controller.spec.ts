import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let categoriesService: any;

  const mockCategoriesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    categoriesService = mockCategoriesService;
  });

  describe('findAll', () => {
    it('should call service.findAll with userId from req', async () => {
      const req = { user: { id: 1 } };
      const expected = [{ id: 1, name: 'Food' }];
      categoriesService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(req);
      expect(categoriesService.findAll).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });

    it('should call service.findAll without userId when req.user is undefined', async () => {
      const req = {};
      categoriesService.findAll.mockResolvedValue([]);

      await controller.findAll(req);
      expect(categoriesService.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      const expected = { id: 1, name: 'Food' };
      categoriesService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(1);
      expect(categoriesService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });
  });

  describe('create', () => {
    it('should call service.create with dto and userId', async () => {
      const dto: CreateCategoryDto = { name: 'New Category', type: 'expense' };
      const req = { user: { id: 1 } };
      const expected = { id: 2, name: 'New Category', type: 'expense' };
      categoriesService.create.mockResolvedValue(expected);

      const result = await controller.create(dto, req);
      expect(categoriesService.create).toHaveBeenCalledWith(dto, 1);
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto and userId', async () => {
      const dto: CreateCategoryDto = { name: 'Updated', type: 'income' };
      const req = { user: { id: 1 } };
      const expected = { id: 1, name: 'Updated', type: 'income' };
      categoriesService.update.mockResolvedValue(expected);

      const result = await controller.update(1, dto, req);
      expect(categoriesService.update).toHaveBeenCalledWith(1, dto, 1);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', async () => {
      categoriesService.remove.mockResolvedValue(undefined);
      await controller.remove(1);
      expect(categoriesService.remove).toHaveBeenCalledWith(1);
    });
  });
});
