import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './guards/jwt-auth.guard';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Validate role-specific fields
    if (dto.role === UserRole.SUPPLIER) {
      if (!dto.companyName || !dto.vat || !dto.address) {
        throw new BadRequestException(
          'Supplier registration requires companyName, vat, and address',
        );
      }
    } else if (dto.role === UserRole.SELLER) {
      if (!dto.storePlatform || !dto.storeUrl) {
        throw new BadRequestException(
          'Seller registration requires storePlatform and storeUrl',
        );
      }
    } else if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin accounts cannot be self-registered');
    }

    // Check for duplicate email
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        ...(dto.role === UserRole.SUPPLIER && {
          supplier: {
            create: {
              companyName: dto.companyName,
              vat: dto.vat,
              address: dto.address,
            },
          },
        }),
        ...(dto.role === UserRole.SELLER && {
          seller: {
            create: {
              storePlatform: dto.storePlatform!,
              storeUrl: dto.storeUrl!,
            },
          },
        }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    try {
      const payload =
        await this.jwtService.verifyAsync<JwtPayload>(refreshToken);

      const newAccessToken = await this.jwtService.signAsync({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      });

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        supplier: {
          select: {
            id: true,
            companyName: true,
            status: true,
          },
        },
        seller: {
          select: {
            id: true,
            storePlatform: true,
            storeUrl: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
