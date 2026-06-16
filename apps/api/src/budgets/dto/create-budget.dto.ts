import { IsNumber, Min, Max } from 'class-validator';

export class CreateBudgetDto {
  @IsNumber()
  categoryId: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  year: number;

  @IsNumber()
  @Min(0)
  limit: number;
}
