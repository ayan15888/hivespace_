export type UserRole = "USER" | "OWNER" | "ADMIN" | "MEMBER";

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  hasTenants: boolean;
  fullName?: string;
  jobTitle?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface AuthResponse extends User {
  token: string;
}
