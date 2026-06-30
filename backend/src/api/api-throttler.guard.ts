import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class ApiThrottlerGuard implements CanActivate {
  private clients = new Map<string, { count: number; resetTime: number }>();
  private readonly LIMIT = 100; // 100 requests
  private readonly WINDOW = 60000; // per 1 minute (60,000ms)

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientInfo = request.apiClient;

    const key = clientInfo ? clientInfo.id : request.ip;
    const now = Date.now();
    const client = this.clients.get(key);

    if (!client || now > client.resetTime) {
      this.clients.set(key, { count: 1, resetTime: now + this.WINDOW });
      return true;
    }

    client.count++;
    if (client.count > this.LIMIT) {
      throw new HttpException(
        'Rate limit exceeded. Maximum 100 requests per minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
