// Mirrors backend/src/services/badge.service.ts's toBadgeDto/toUserBadgeDto.
export interface Badge {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  awarded_at?: string;
  auto_awarded?: boolean;
}

export interface CreateBadgeInput {
  key: string;
  name: string;
  description: string;
  icon: string;
}

export type UpdateBadgeInput = Partial<Omit<CreateBadgeInput, 'key'>>;
