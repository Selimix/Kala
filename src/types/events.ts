import type { ActivityType } from '../constants/activity-types';
import type { Place } from './places';
import type { Persona } from './personas';

// Garde pour retrocompatibilité
import type { EventCategory } from '../constants/categories';

export interface CalendarEvent {
  id: string;
  user_id: string;
  calendar_id: string | null;
  created_by: string | null;
  creator?: { display_name: string } | null; // via join profiles!created_by
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  // Nouveau modèle
  activity_type: ActivityType;
  place_id: string | null;
  place?: Place | null;          // via join Supabase
  event_personas?: { persona: Persona }[]; // via junction table join
  // Ancien modèle (rétrocompat)
  location: string | null;
  people: string[];
  category: EventCategory;
  is_all_day: boolean;
  recurrence_rule: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  activity_type: ActivityType;
  place_id?: string;
  persona_ids?: string[];
  calendar_id?: string;
  // Rétrocompat
  location?: string;
  people?: string[];
  category?: EventCategory;
  is_all_day?: boolean;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  activity_type?: ActivityType;
  place_id?: string | null;
  persona_ids?: string[];
  // Rétrocompat
  location?: string;
  people?: string[];
  category?: EventCategory;
  is_all_day?: boolean;
}
