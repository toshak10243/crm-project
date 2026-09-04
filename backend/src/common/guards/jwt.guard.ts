import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantPoolService } from '../../database/tenant-pool.service';
import * as jwt from 'jsonwebtoken';

// Har protected route pe ye guard lagta hai
// JWT verify karta hai aur tenant DB pool inject karta hai request mein
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private tenantPoolService: TenantPoolService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Authorization header se token nikalo
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token not provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      // Token verify karo
      const secret = this.configService.get<string>('jwt.accessSecret');
      const payload = jwt.verify(token, secret) as any;

      // Super admin token client routes pe use nahi ho sakta
      if (payload.type === 'super_admin') {
        throw new UnauthorizedException('Invalid token type');
      }

      // User info request mein attach karo
      request.user = {
        id: payload.sub,
        role: payload.role,
        dbName: payload.dbName,
        companySlug: payload.companySlug,
      };

      // Tenant DB pool inject karo — service mein use hoga
      request.dbPool = this.tenantPoolService.getPool(payload.dbName);

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}