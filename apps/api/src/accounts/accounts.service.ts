import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { Transaction } from '../entities/transaction.entity';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async findAll(userId?: number): Promise<Account[]> {
    const where = userId ? { userId } : {};
    return this.accountRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Account & { currentBalance: number }> {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    const currentBalance = await this.computeBalance(id);
    return { ...account, currentBalance };
  }

  private async computeBalance(accountId: number): Promise<number> {
    const base = await this.accountRepository.findOne({
      where: { id: accountId },
      select: { id: true, balance: true },
    });
    if (!base) return 0;

    const txResult = await this.transactionRepository
      .createQueryBuilder('t')
      .select('COALESCE(SUM(CASE WHEN t.type = :income THEN t.amount ELSE -t.amount END), 0)', 'net')
      .where('t.accountId = :accountId', { accountId })
      .setParameter('income', 'income')
      .getRawOne();

    return base.balance + (Number(txResult?.net) || 0);
  }

  async create(dto: CreateAccountDto, userId?: number): Promise<Account> {
    const account = this.accountRepository.create({
      ...dto,
      balance: dto.balance ?? 0,
      currency: dto.currency ?? 'USD',
      userId: userId ?? null,
    });
    return this.accountRepository.save(account);
  }

  async update(id: number, dto: Partial<CreateAccountDto>, userId?: number): Promise<Account> {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    Object.assign(account, dto);
    if (userId !== undefined) {
      account.userId = userId ?? null;
    }
    return this.accountRepository.save(account);
  }

  async remove(id: number): Promise<void> {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const txCount = await this.transactionRepository.count({
      where: { accountId: id },
    });

    if (txCount > 0) {
      throw new BadRequestException(
        'Cannot delete account with existing transactions. Delete transactions first.',
      );
    }

    await this.accountRepository.remove(account);
  }
}
