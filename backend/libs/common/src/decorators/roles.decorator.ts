import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user.enums';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
