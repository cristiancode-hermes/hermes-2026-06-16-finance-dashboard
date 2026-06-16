import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async findAll(query: QueryTransactionDto, userId?: number): Promise<Transaction[]> {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }
    if (query.accountId) {
      where.accountId = query.accountId;
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.startDate && query.endDate) {
      where.date = Between(new Date(query.startDate), new Date(query.endDate));
    } else if (query.startDate) {
      where.date = Between(new Date(query.startDate), new Date('9999-12-31'));
    } else if (query.endDate) {
      where.date = Between(new Date('1970-01-01'), new Date(query.endDate));
    }

    return this.transactionRepository.find({
      where,
      relations: { account: true, category: true },
      order: { date: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: { account: true, category: true },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  async create(dto: CreateTransactionDto, userId?: number): Promise<Transaction> {
    const transaction = this.transactionRepository.create({
      ...dto,
      date: new Date(dto.date),
      userId: userId ?? null,
    });
    return this.transactionRepository.save(transaction);
  }

  async update(id: number, dto: Partial<CreateTransactionDto>, userId?: number): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({ where: { id } });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    Object.assign(transaction, dto);
    if (dto.date) {
      transaction.date = new Date(dto.date);
    }
    if (userId !== undefined) {
      transaction.userId = userId ?? null;
    }
    return this.transactionRepository.save(transaction);
  }

  async remove(id: number): Promise<void> {
    const transaction = await this.transactionRepository.findOne({ where: { id } });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    await this.transactionRepository.remove(transaction);
  }
}
