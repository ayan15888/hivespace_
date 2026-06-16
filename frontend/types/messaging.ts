// ─── Enums ────────────────────────────────────────────────────────────────────

export type ChannelType = 'PUBLIC' | 'PRIVATE' | 'DM' | 'THREAD'
export type MessageType = 'TEXT' | 'FILE' | 'SYSTEM' | 'AI'

// ─── Core shapes ──────────────────────────────────────────────────────────────

export interface UserSummary {
  id: string
  fullName: string | null
  avatarUrl: string | null
  avatarColor: string | null
}

export interface ReactionSummary {
  emoji: string
  count: number
  reactedByMe: boolean
}

export interface MessageResponse {
  id: string
  content: string
  type: MessageType
  channelId: string
  sender: UserSummary | null       // null if user was deleted
  parentId: string | null
  isEdited: boolean
  isDeleted: boolean
  createdAt: string                // ISO 8601
  editedAt: string | null
  reactions: ReactionSummary[]
  replyCount: number
}

export interface ChannelResponse {
  id: string
  name: string | null              // null for DM channels
  type: ChannelType
  workspaceId: string
  projectId: string | null
  teamId: string | null
  unreadCount: number
}

// ─── Request shapes ───────────────────────────────────────────────────────────

export interface CreateChannelRequest {
  name: string
  type: ChannelType
  workspaceId: string
  projectId?: string
  teamId?: string
}

export interface OpenDmRequest {
  workspaceId: string
  targetUserId: string
}

export interface SendMessageRequest {
  content: string
  type?: MessageType               // defaults to TEXT
  parentId?: string
}

export interface EditMessageRequest {
  content: string
}

// ─── WebSocket payloads ───────────────────────────────────────────────────────

export interface TypingUser {
  userId: string
  displayName: string
  typing: boolean
}

export interface DeleteBroadcast {
  id: string
  isDeleted: true
}

// Union type for incoming channel messages — either a full message or a deletion
export type ChannelBroadcast = MessageResponse | DeleteBroadcast

export function isDeleteBroadcast(payload: ChannelBroadcast): payload is DeleteBroadcast {
  return (payload as DeleteBroadcast).isDeleted === true
}
