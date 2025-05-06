import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}
