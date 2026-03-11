import { EventCategory } from '../constants/categories';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
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
  location?: string;
  people?: string[];
  category: EventCategory;
  is_all_day?: boolean;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  people?: string[];
  category?: EventCategory;
  is_all_day?: boolean;
}
