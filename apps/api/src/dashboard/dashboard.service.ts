import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { Transaction } from '../entities/transaction.entity';
import { Budget } from '../entities/budget.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
  ) {}

  async getSummary(userId?: number) {
    const accountWhere = userId ? { userId } : {};
    const txWhere = userId ? { userId } : {};

    // Total balance - sum of all account balances
    const balanceResult = await this.accountRepository
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.balance), 0)', 'total')
      .where(userId ? 'a.userId = :userId' : '1=1', userId ? { userId } : {})
      .getRawOne();
    const totalBalance = Number(balanceResult?.total) || 0;

    // Monthly income and expenses
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());

    const monthlyIncomeResult = await this.transactionRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .where("strftime('%m', t.date) = :month", { month: currentMonth })
      .andWhere("strftime('%Y', t.date) = :year", { year: currentYear })
      .andWhere("t.type = 'income'")
      .getRawOne();

    const monthlyExpensesResult = await this.transactionRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'total')
      .where("strftime('%m', t.date) = :month", { month: currentMonth })
      .andWhere("strftime('%Y', t.date) = :year", { year: currentYear })
      .andWhere("t.type = 'expense'")
      .getRawOne();

    const monthlyIncome = Number(monthlyIncomeResult?.total) || 0;
    const monthlyExpenses = Number(monthlyExpensesResult?.total) || 0;

    // Recent transactions (last 5)
    const recentTransactions = await this.transactionRepository.find({
      where: txWhere,
      relations: { account: true, category: true },
      order: { date: 'DESC' },
      take: 5,
    });

    // Budget status for current month
    const budgets = await this.budgetRepository.find({
      where: {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        ...(userId ? { userId } : {}),
      },
      relations: { category: true },
    });

    const budgetStatus = await Promise.all(
      budgets.map(async (budget) => {
        const actualResult = await this.transactionRepository
          .createQueryBuilder('t')
          .select('COALESCE(SUM(t.amount), 0)', 'total')
          .where('t.categoryId = :categoryId', { categoryId: budget.categoryId })
          .andWhere("strftime('%m', t.date) = :month", { month: currentMonth })
          .andWhere("strftime('%Y', t.date) = :year", { year: currentYear })
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
        };
      }),
    );

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      recentTransactions,
      budgetStatus,
    };
  }
}
