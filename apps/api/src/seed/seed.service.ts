import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Account } from '../entities/account.entity';
import { Transaction } from '../entities/transaction.entity';
import { Budget } from '../entities/budget.entity';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
  ) {}

  async seed() {
    // Check if demo user already exists
    const existingUser = await this.userRepository.findOne({ where: { email: 'demo@example.com' } });
    if (existingUser) {
      throw new HttpException('Demo data already seeded. Delete the database file to re-seed.', HttpStatus.CONFLICT);
    }

    // Create demo user
    const hashedPassword = crypto.createHash('sha256').update('password123').digest('hex');
    const user = this.userRepository.create({
      email: 'demo@example.com',
      name: 'Demo User',
      password: hashedPassword,
    });
    const savedUser = await this.userRepository.save(user);

    // Create categories
    const categoriesData = [
      { name: 'Salary', type: 'income' as const, icon: '💼', color: '#22c55e' },
      { name: 'Freelance', type: 'income' as const, icon: '💻', color: '#3b82f6' },
      { name: 'Food', type: 'expense' as const, icon: '🍕', color: '#ef4444' },
      { name: 'Transport', type: 'expense' as const, icon: '🚗', color: '#f59e0b' },
      { name: 'Entertainment', type: 'expense' as const, icon: '🎬', color: '#8b5cf6' },
      { name: 'Utilities', type: 'expense' as const, icon: '💡', color: '#06b6d4' },
    ];

    const categories = await Promise.all(
      categoriesData.map((cat) => {
        const category = this.categoryRepository.create({
          ...cat,
          userId: savedUser.id,
        });
        return this.categoryRepository.save(category);
      }),
    );

    // Create accounts
    const accountsData = [
      { name: 'Checking Account', type: 'checking' as const, balance: 5000 },
      { name: 'Savings Account', type: 'savings' as const, balance: 10000 },
      { name: 'Credit Card', type: 'credit' as const, balance: -500 },
    ];

    const accounts = await Promise.all(
      accountsData.map((acc) => {
        const account = this.accountRepository.create({
          ...acc,
          currency: 'USD',
          userId: savedUser.id,
        });
        return this.accountRepository.save(account);
      }),
    );

    // Create 20 transactions over last 30 days
    const descriptions = [
      'Monthly salary', 'Freelance project payment', 'Grocery shopping',
      'Gas station', 'Netflix subscription', 'Electric bill',
      'Internet bill', 'Water bill', 'Restaurant dinner',
      'Coffee shop', 'Uber ride', 'Movie tickets',
      'Concert tickets', 'Phone bill', 'Amazon purchase',
      'Supermarket', 'Parking fee', 'Gym membership',
      'Online course', 'Clothing purchase',
    ];

    const transactions = [];
    const now = new Date();
    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);

      const isIncome = i < 4;
      const categoryIndex = isIncome ? (i % 2) : (2 + (i % 4));
      const amount = isIncome
        ? Math.floor(Math.random() * 3000) + 1000
        : Math.floor(Math.random() * 200) + 10;

      const transaction = this.transactionRepository.create({
        amount,
        description: descriptions[i],
        date,
        type: isIncome ? 'income' : 'expense',
        accountId: accounts[i % 3].id,
        categoryId: categories[categoryIndex].id,
        userId: savedUser.id,
      });
      transactions.push(transaction);
    }
    await this.transactionRepository.save(transactions);

    // Create 4 budgets for current month
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const budgetsData = [
      { categoryId: categories[2].id, month: currentMonth, year: currentYear, limit: 800 },   // Food
      { categoryId: categories[3].id, month: currentMonth, year: currentYear, limit: 300 },   // Transport
      { categoryId: categories[4].id, month: currentMonth, year: currentYear, limit: 200 },   // Entertainment
      { categoryId: categories[5].id, month: currentMonth, year: currentYear, limit: 400 },   // Utilities
    ];

    const budgets = await Promise.all(
      budgetsData.map((bgt) => {
        const budget = this.budgetRepository.create({
          ...bgt,
          spent: 0,
          userId: savedUser.id,
        });
        return this.budgetRepository.save(budget);
      }),
    );

    return {
      message: 'Demo data seeded successfully',
      user: { email: savedUser.email, name: savedUser.name },
      categories: categories.length,
      accounts: accounts.length,
      transactions: transactions.length,
      budgets: budgets.length,
    };
  }
}
