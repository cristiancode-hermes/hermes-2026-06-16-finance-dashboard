import { IsString, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { TransactionType } from '../../entities/transaction.entity';

export class CreateTransactionDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  description: string;

  @IsDateString()
  date: string;

  @IsEnum(['income', 'expense'] as TransactionType[])
  type: TransactionType;

  @IsNumber()
  accountId: number;

  @IsNumber()
  categoryId: number;
}
