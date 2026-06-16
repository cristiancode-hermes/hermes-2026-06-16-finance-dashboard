import { IsString, IsEnum, IsOptional, IsHexColor } from 'class-validator';
import { CategoryType } from '../../entities/category.entity';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsEnum(['income', 'expense'] as CategoryType[])
  type: CategoryType;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
