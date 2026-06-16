import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repo: any;

  const mockCategory: any = {
    id: 1,
    name: 'Food',
    type: 'expense',
    icon: '🍕',
    color: '#ff0000',
    userId: 1,
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
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    repo = mockRepo;
  });

  describe('findAll', () => {
    it('should return all categories without userId', async () => {
      repo.find.mockResolvedValue([mockCategory]);
      const result = await service.findAll();
      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockCategory]);
    });

    it('should filter by userId when provided', async () => {
      repo.find.mockResolvedValue([mockCategory]);
      const result = await service.findAll(1);
      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockCategory]);
    });

    it('should return empty array when no categories', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      repo.findOne.mockResolvedValue(mockCategory);
      const result = await service.findOne(1);
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new category', async () => {
      const dto: CreateCategoryDto = {
        name: 'Salary',
        type: 'income',
        icon: '💼',
        color: '#22c55e',
      };
      const created = { ...mockCategory, name: 'Salary', type: 'income', icon: '💼', color: '#22c55e' };
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.create(dto, 1);
      expect(repo.create).toHaveBeenCalledWith({
        name: 'Salary',
        type: 'income',
        icon: '💼',
        color: '#22c55e',
        userId: 1,
      });
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should set userId to null when not provided', async () => {
      const dto: CreateCategoryDto = { name: 'General', type: 'expense' };
      repo.create.mockReturnValue(mockCategory);
      repo.save.mockResolvedValue(mockCategory);
      await service.create(dto);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null }),
      );
    });
  });

  describe('update', () => {
    it('should update an existing category', async () => {
      const existing = { ...mockCategory };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue({ ...existing, name: 'Updated Category' });

      const result = await service.update(1, { name: 'Updated Category' });
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(repo.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Category');
    });

    it('should update userId when provided', async () => {
      const existing = { ...mockCategory, userId: null };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue({ ...existing, userId: 2 });

      await service.update(1, { name: 'Updated' }, 2);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 2 }),
      );
    });

    it('should throw NotFoundException when updating non-existent category', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(999, { name: 'Nope' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a category by id', async () => {
      repo.findOne.mockResolvedValue(mockCategory);
      repo.remove.mockResolvedValue(mockCategory);
      await service.remove(1);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(repo.remove).toHaveBeenCalledWith(mockCategory);
    });

    it('should throw NotFoundException when removing non-existent category', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
