import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export type CategoryType = 'income' | 'expense';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    type: 'simple-enum',
    enum: ['income', 'expense'] as CategoryType[],
  })
  type: CategoryType;

  @Column({ default: '💰' })
  icon: string;

  @Column({ default: '#6366f1' })
  color: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ name: 'userId', nullable: true })
  userId: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
