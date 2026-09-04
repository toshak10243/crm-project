import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// @Roles('admin', 'manager') — route pe allowed roles set karo
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);