import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// @CurrentUser() decorator — JWT se user info nikalata hai
// Controller mein seedha use karo: getProfile(@CurrentUser() user: JwtPayload)
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);