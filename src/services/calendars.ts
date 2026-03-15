import { supabase } from './supabase';
import type {
  SharedCalendar,
  CalendarMember,
  InviteCode,
  CreateCalendarInput,
  CreateInviteCodeInput,
  JoinCalendarResult,
  CalendarWithRole,
  CalendarRole,
} from '../types/calendars';

// ============================================================
// Calendar CRUD
// ============================================================

export async function createCalendar(input: CreateCalendarInput): Promise<SharedCalendar> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  // 1. Create the calendar
  const { data: calendar, error } = await supabase
    .from('calendars')
    .insert({
      name: input.name,
      description: input.description || null,
      emoji: input.emoji || '📅',
      color: input.color || '#B8956A',
      created_by: user.id,
    })
    .select()
    .single();
  if (error) throw error;

  // 2. Add creator as owner
  const { error: memberError } = await supabase
    .from('calendar_members')
    .insert({
      calendar_id: calendar.id,
      user_id: user.id,
      role: 'owner' as CalendarRole,
    });
  if (memberError) throw memberError;

  // 3. Set as active calendar + mark onboarding complete
  await supabase
    .from('profiles')
    .update({
      active_calendar_id: calendar.id,
      has_completed_onboarding: true,
    })
    .eq('id', user.id);

  return calendar;
}

export async function getMyCalendars(): Promise<CalendarWithRole[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('calendar_members')
    .select('role, calendar:calendars(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row.calendar,
    role: row.role,
  }));
}

export async function updateCalendar(
  calendarId: string,
  updates: Partial<CreateCalendarInput>
): Promise<SharedCalendar> {
  const { data, error } = await supabase
    .from('calendars')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', calendarId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCalendar(calendarId: string): Promise<void> {
  const { error } = await supabase
    .from('calendars')
    .delete()
    .eq('id', calendarId);
  if (error) throw error;
}

// ============================================================
// Members
// ============================================================

export async function getCalendarMembers(calendarId: string): Promise<CalendarMember[]> {
  const { data, error } = await supabase
    .from('calendar_members')
    .select('*, profile:profiles(display_name, avatar_url)')
    .eq('calendar_id', calendarId)
    .order('joined_at');

  if (error) throw error;
  return data || [];
}

export async function updateMemberRole(
  calendarId: string,
  userId: string,
  role: CalendarRole
): Promise<void> {
  const { error } = await supabase
    .from('calendar_members')
    .update({ role })
    .eq('calendar_id', calendarId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function removeMember(calendarId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_members')
    .delete()
    .eq('calendar_id', calendarId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function leaveCalendar(calendarId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { error } = await supabase
    .from('calendar_members')
    .delete()
    .eq('calendar_id', calendarId)
    .eq('user_id', user.id);
  if (error) throw error;
}

// ============================================================
// Active Calendar
// ============================================================

export async function setActiveCalendar(calendarId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  await supabase
    .from('profiles')
    .update({ active_calendar_id: calendarId })
    .eq('id', user.id);
}

// ============================================================
// Invite Codes
// ============================================================

export async function createInviteCode(input: CreateInviteCodeInput): Promise<InviteCode> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const expiresAt = input.expires_in_days
    ? new Date(Date.now() + input.expires_in_days * 86400000).toISOString()
    : null;

  // Generate code via DB function
  const { data: codeResult } = await supabase.rpc('generate_invite_code');
  const code = codeResult as string;

  const { data, error } = await supabase
    .from('invite_codes')
    .insert({
      calendar_id: input.calendar_id,
      code,
      created_by: user.id,
      role: input.role || 'editor',
      max_uses: input.max_uses || null,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function joinCalendarByCode(code: string): Promise<JoinCalendarResult> {
  const { data, error } = await supabase.rpc('join_calendar_by_code', {
    code_input: code,
  });
  if (error) throw error;
  return data as JoinCalendarResult;
}

export async function getInviteCodes(calendarId: string): Promise<InviteCode[]> {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('calendar_id', calendarId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteInviteCode(codeId: string): Promise<void> {
  const { error } = await supabase
    .from('invite_codes')
    .delete()
    .eq('id', codeId);
  if (error) throw error;
}
