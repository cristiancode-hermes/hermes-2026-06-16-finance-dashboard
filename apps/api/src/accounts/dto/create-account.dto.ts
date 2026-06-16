import { IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { AccountType } from '../../entities/account.entity';

export class CreateAccountDto {
  @IsString()
  name: string;

  @IsEnum(['checking', 'savings', 'credit', 'investment', 'cash'] as AccountType[])
  type: AccountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  balance?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
