import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

// IP Whitelist guard — agar company ne IP restriction on ki hai
// Tab sirf allowed IPs se login ho sakta hai
@Injectable()
export class IpGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const dbPool = request.dbPool;

    if (!dbPool) {
      return true;
    }

    try {
      // Pehle check karo ki IP restriction enabled hai ya nahi
      const settingResult = await dbPool.query(
        `SELECT value FROM settings WHERE key = 'ip_restriction_enabled'`,
      );

      const isEnabled =
        settingResult.rows[0]?.value === true ||
        settingResult.rows[0]?.value === 'true';

      // IP restriction off hai to sab allow karo
      if (!isEnabled) {
        return true;
      }

      // Request ka IP address nikalo
      const clientIp =
        request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        request.socket.remoteAddress ||
        '';

      // Whitelist mein check karo
      const ipResult = await dbPool.query(
        `SELECT id FROM ip_whitelist 
         WHERE ip_address = $1 AND is_active = true`,
        [clientIp],
      );

      if (ipResult.rows.length === 0) {
        throw new ForbiddenException(
          `Access denied. Your IP (${clientIp}) is not whitelisted`,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // DB error aaye to allow karo — IP check fail nahi hona chahiye silently
      return true;
    }
  }
}