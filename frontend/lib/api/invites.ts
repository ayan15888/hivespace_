import { apiFetch } from './client';
import { InviteRequest, InviteResponse, InviteAcceptRequest } from '@/types/invite';

export async function generateInvite(data: InviteRequest): Promise<InviteResponse> {
    const payload = {
        ...data,
        tenantRole: data.tenantRole || data.role || 'MEMBER',
    };
    const res: InviteResponse = await apiFetch('/api/i/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (res && !res.role) {
        res.role = res.tenantRole;
    }
    return res;
}

export async function joinInvite(data: InviteAcceptRequest): Promise<{ message: string }> {
    return apiFetch('/api/i/join', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function getTenantInvitations(tenantId: string): Promise<InviteResponse[]> {
    const list: InviteResponse[] = await apiFetch(`/api/i/t/${tenantId}`, {
        method: 'GET',
    });
    if (list && Array.isArray(list)) {
        list.forEach(res => {
            if (res && !res.role) {
                res.role = res.tenantRole;
            }
        });
    }
    return list;
}

export async function getInviteDetails(token: string): Promise<InviteResponse> {
    const res: InviteResponse = await apiFetch(`/api/i/${token}`, {
        method: 'GET',
    });
    if (res && !res.role) {
        res.role = res.tenantRole;
    }
    return res;
}

export async function validateInvite(token: string, orgSlug?: string): Promise<InviteResponse> {
    const url = orgSlug 
        ? `/api/i/validate?token=${encodeURIComponent(token)}&orgSlug=${encodeURIComponent(orgSlug)}`
        : `/api/i/validate?token=${encodeURIComponent(token)}`;
    const res: InviteResponse = await apiFetch(url, {
        method: 'GET',
    });
    if (res && !res.role) {
        res.role = res.tenantRole;
    }
    return res;
}
