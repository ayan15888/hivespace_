import { api } from './client';
import { InviteRequest, InviteResponse, JoinRequest } from '@/types/invite';

export async function generateInvite(data: InviteRequest): Promise<InviteResponse> {
    const res = await api.post<InviteResponse>('/i/generate', data);
    return res.data;
}

export async function joinInvite(data: JoinRequest): Promise<string> {
    const res = await api.post<string>('/i/join', data);
    return res.data;
}
