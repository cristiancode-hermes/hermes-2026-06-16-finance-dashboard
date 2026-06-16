import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'cash';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    type: 'simple-enum',
    enum: ['checking', 'savings', 'credit', 'investment', 'cash'] as AccountType[],
  })
  type: AccountType;

  @Column({ type: 'real', default: 0 })
  balance: number;

  @Column({ default: 'USD' })
  currency: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ name: 'userId', nullable: true })
  userId: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
