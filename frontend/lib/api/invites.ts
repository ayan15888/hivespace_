import { apiFetch } from './client';
import { InviteRequest, InviteResponse, JoinRequest } from '@/types/invite';

export async function generateInvite(data: InviteRequest): Promise<InviteResponse> {
    return apiFetch('/api/i/generate', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function joinInvite(data: JoinRequest): Promise<{ message: string }> {
    return apiFetch('/api/i/join', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function getTenantInvitations(tenantId: string): Promise<InviteResponse[]> {
    return apiFetch(`/api/i/t/${tenantId}`, {
        method: 'GET',
    });
}

export async function getInviteDetails(token: string): Promise<InviteResponse> {
    return apiFetch(`/api/i/${token}`);
}

