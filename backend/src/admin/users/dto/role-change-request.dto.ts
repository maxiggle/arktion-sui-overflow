import { AdminRole } from '../../types/admin-role.enum';

export type RoleChangeStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface RoleChangeRequestDto {
  id: string;
  targetId: string;
  targetEmail?: string;
  previousRole: AdminRole;
  requestedRole: AdminRole;
  status: RoleChangeStatus;
  reason: string | null;
  requestedById: string;
  requestedByEmail?: string;
  reviewedById: string | null;
  reviewedByEmail?: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}
