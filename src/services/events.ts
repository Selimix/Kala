import { supabase } from './supabase';
import { linkPersonasToEvent } from './personas';
import type { CalendarEvent, CreateEventInput, UpdateEventInput } from '../types/events';

// Sélection enrichie avec places, personas et créateur (joins Supabase)
const ENRICHED_SELECT = '*, place:places(*), event_personas:events_personas(persona:personas(*)), creator:profiles!created_by(display_name)';

export async function getEventsForDate(date: string, calendarId?: string): Promise<CalendarEvent[]> {
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  let query = supabase
    .from('events')
    .select(ENRICHED_SELECT)
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)
    .order('start_time', { ascending: true });

  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getEventsForRange(
  startDate: string,
  endDate: string,
  calendarId?: string
): Promise<CalendarEvent[]> {
  let query = supabase
    .from('events')
    .select(ENRICHED_SELECT)
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .order('start_time', { ascending: true });

  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { persona_ids, ...eventData } = input;

  const { data, error } = await supabase
    .from('events')
    .insert({
      ...eventData,
      user_id: user.id,
      created_by: user.id,
      calendar_id: input.calendar_id || null,
      people: input.people || [],
      category: input.category || 'autre',
      is_all_day: input.is_all_day || false,
    })
    .select()
    .single();

  if (error) throw error;

  // Lier les personas via la junction table
  if (persona_ids && persona_ids.length > 0) {
    await linkPersonasToEvent(data.id, persona_ids);
  }

  return data;
}

export async function updateEvent(
  eventId: string,
  updates: UpdateEventInput
): Promise<CalendarEvent> {
  const { persona_ids, ...eventUpdates } = updates;

  const { data, error } = await supabase
    .from('events')
    .update({ ...eventUpdates, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;

  // Mettre à jour les personas si fournies
  if (persona_ids !== undefined) {
    await linkPersonasToEvent(eventId, persona_ids);
  }

  return data;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw error;
}
