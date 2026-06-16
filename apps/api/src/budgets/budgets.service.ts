import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { Transaction } from '../entities/transaction.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async findAll(userId?: number): Promise<Budget[]> {
    const where = userId ? { userId } : {};
    return this.budgetRepository.find({
      where,
      relations: { category: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Budget> {
    const budget = await this.budgetRepository.findOne({
      where: { id },
      relations: { category: true },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return budget;
  }

  async create(dto: CreateBudgetDto, userId?: number): Promise<Budget> {
    const budget = this.budgetRepository.create({
      ...dto,
      spent: 0,
      userId: userId ?? null,
    });
    return this.budgetRepository.save(budget);
  }

  async update(id: number, dto: Partial<CreateBudgetDto>, userId?: number): Promise<Budget> {
    const budget = await this.findOne(id);
    Object.assign(budget, dto);
    if (userId !== undefined) {
      budget.userId = userId ?? null;
    }
    return this.budgetRepository.save(budget);
  }

  async remove(id: number): Promise<void> {
    const budget = await this.findOne(id);
    await this.budgetRepository.remove(budget);
  }

  async getSummary(userId?: number): Promise<any[]> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const where: any = { month: currentMonth, year: currentYear };
    if (userId) {
      where.userId = userId;
    }

    const budgets = await this.budgetRepository.find({
      where,
      relations: { category: true },
    });

    const summary = await Promise.all(
      budgets.map(async (budget) => {
        const actualResult = await this.transactionRepository
          .createQueryBuilder('t')
          .select('COALESCE(SUM(t.amount), 0)', 'total')
          .where('t.categoryId = :categoryId', { categoryId: budget.categoryId })
          .andWhere("strftime('%m', t.date) = :month", { month: String(currentMonth).padStart(2, '0') })
          .andWhere("strftime('%Y', t.date) = :year", { year: String(currentYear) })
          .andWhere("t.type = 'expense'")
          .getRawOne();

        const actual = Number(actualResult?.total) || 0;

        return {
          id: budget.id,
          category: budget.category,
          limit: budget.limit,
          actual,
          remaining: budget.limit - actual,
          percentage: budget.limit > 0 ? Math.round((actual / budget.limit) * 100) : 0,
          month: budget.month,
          year: budget.year,
        };
      }),
    );

    return summary;
  }
}
