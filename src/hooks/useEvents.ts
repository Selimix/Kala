import { useState, useEffect, useCallback } from 'react';
import { getEventsForDate } from '../services/events';
import { supabase } from '../services/supabase';
import type { CalendarEvent } from '../types/events';

export function useEvents(selectedDate: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEventsForDate(selectedDate);
      setEvents(data);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Realtime subscription pour les mises a jour en temps reel
  useEffect(() => {
    const channel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents]);

  return { events, loading, refetch: fetchEvents };
}
