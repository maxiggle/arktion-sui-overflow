import { AdminRole } from './admin-role.enum';

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  role: AdminRole;
  sessionId: string;
}
