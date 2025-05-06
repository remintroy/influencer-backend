import { User, UserRole } from 'src/user/user.schema';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthenticatedUser extends Partial<User> {
  userId: string;
  email: string;
  role: UserRole;
  databaseFetched: boolean;
}
