export type Role = 'ADMIN' | 'USER';

export interface UserProfileResponse {
  id: number;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  role: Role;
}
