import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async register(dto: RegisterDto): Promise<{ token: string; user: Partial<User> }> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = this.userRepository.create({
      email: dto.email,
      name: dto.name,
      password: this.hashPassword(dto.password),
    });

    const saved = await this.userRepository.save(user);
    const token = this.jwtService.sign({ sub: saved.id, email: saved.email });

    const { password, ...userWithoutPassword } = saved;
    return { token, user: userWithoutPassword };
  }

  async login(dto: LoginDto): Promise<{ token: string; user: Partial<User> }> {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const hashedPassword = this.hashPassword(dto.password);
    if (user.password !== hashedPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    const { password, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }
}
