import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(userId?: number): Promise<Category[]> {
    const where = userId ? { userId } : {};
    return this.categoryRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async create(dto: CreateCategoryDto, userId?: number): Promise<Category> {
    const category = this.categoryRepository.create({
      ...dto,
      userId: userId ?? null,
    });
    return this.categoryRepository.save(category);
  }

  async update(id: number, dto: Partial<CreateCategoryDto>, userId?: number): Promise<Category> {
    const category = await this.findOne(id);
    Object.assign(category, dto);
    if (userId !== undefined) {
      category.userId = userId ?? null;
    }
    return this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
  }
}
