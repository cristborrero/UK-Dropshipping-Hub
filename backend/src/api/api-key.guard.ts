import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      const authHeader = request.headers['authorization'];
      if (authHeader && authHeader.toLowerCase().startsWith('apikey ')) {
        apiKey = authHeader.substring(7).trim();
      }
    }

    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    const client = await this.prisma.apiClient.findUnique({
      where: { apiKey },
    });

    if (!client || !client.isActive) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    // Attach client context to request
    request.apiClient = client;
    return true;
  }
}
