// ============================================================
// Types pour les calendriers partages
// ============================================================

export type CalendarRole = 'owner' | 'editor' | 'viewer';

export interface SharedCalendar {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarWithRole extends SharedCalendar {
  role: CalendarRole;
}

export interface CalendarMember {
  id: string;
  calendar_id: string;
  user_id: string;
  role: CalendarRole;
  joined_at: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface InviteCode {
  id: string;
  calendar_id: string;
  code: string;
  created_by: string;
  role: CalendarRole;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  created_at: string;
}

export interface CreateCalendarInput {
  name: string;
  description?: string;
  emoji?: string;
  color?: string;
}

export interface CreateInviteCodeInput {
  calendar_id: string;
  role?: CalendarRole;
  max_uses?: number;
  expires_in_days?: number;
}

export interface JoinCalendarResult {
  success?: boolean;
  error?: string;
  calendar_id?: string;
  calendar_name?: string;
  role?: string;
}
