import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// @CurrentDb() decorator — request se tenant DB pool nikalata hai
// Service mein pass karo queries ke liye
export const CurrentDb = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.dbPool;
  },
);