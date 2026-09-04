import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

// Sirf Super Admin routes ke liye — normal user yahan nahi aa sakta
// /api/super-admin/* routes pe ye guard lagta hai
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token not provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      const secret = this.configService.get<string>('jwt.accessSecret');
      const payload = jwt.verify(token, secret) as any;

      // Sirf super_admin type token allow karo
      if (payload.type !== 'super_admin') {
        throw new UnauthorizedException('Super Admin access required');
      }

      // Super admin info request mein daalo
      request.user = {
        id: payload.sub,
        email: payload.email,
        type: 'super_admin',
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}