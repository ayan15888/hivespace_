import { TenantRole, tenantRank } from '@/types/roles';

export const canInviteToOrg = (role: TenantRole): boolean =>
  tenantRank(role) >= tenantRank('ADMIN');

export const canCreateWorkspace = (role: TenantRole): boolean =>
  tenantRank(role) >= tenantRank('ADMIN');

export const canManageTenantMembers = (role: TenantRole): boolean =>
  tenantRank(role) >= tenantRank('ADMIN');

export const canViewMemberDirectory = (role: TenantRole): boolean =>
  role !== 'BILLING_ADMIN';

export const canAccessBilling = (role: TenantRole): boolean =>
  role === 'OWNER' || role === 'BILLING_ADMIN';
