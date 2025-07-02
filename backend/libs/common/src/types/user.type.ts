import { UserRole } from '../enums/user.enums';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  phoneNumber?: string;
  isVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
