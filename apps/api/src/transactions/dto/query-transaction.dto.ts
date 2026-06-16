import { IsOptional, IsNumber, IsDateString } from 'class-validator';

export class QueryTransactionDto {
  @IsOptional()
  @IsNumber()
  accountId?: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
