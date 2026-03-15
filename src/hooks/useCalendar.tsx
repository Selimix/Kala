import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getMyCalendars, setActiveCalendar as setActiveCalendarService } from '../services/calendars';
import { useAuth } from './useAuth';
import type { CalendarWithRole, CalendarRole } from '../types/calendars';

interface CalendarContextType {
  calendars: CalendarWithRole[];
  activeCalendar: CalendarWithRole | null;
  activeCalendarId: string | null;
  activeRole: CalendarRole | null;
  loading: boolean;
  setActiveCalendar: (calendarId: string) => Promise<void>;
  refreshCalendars: () => Promise<void>;
  hasCalendars: boolean;
}

const CalendarContext = createContext<CalendarContextType>({
  calendars: [],
  activeCalendar: null,
  activeCalendarId: null,
  activeRole: null,
  loading: true,
  setActiveCalendar: async () => {},
  refreshCalendars: async () => {},
  hasCalendars: false,
});

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { session, profile, refreshProfile } = useAuth();
  const [calendars, setCalendars] = useState<CalendarWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const activeCalendarId = profile?.active_calendar_id || null;
  const activeCalendar = calendars.find(c => c.id === activeCalendarId) || calendars[0] || null;
  const activeRole = activeCalendar?.role || null;

  const refreshCalendars = useCallback(async () => {
    if (!session) {
      setCalendars([]);
      setLoading(false);
      return;
    }
    try {
      const cals = await getMyCalendars();
      setCalendars(cals);
    } catch (err) {
      console.error('Erreur chargement calendriers:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refreshCalendars();
  }, [refreshCalendars]);

  const setActiveCalendar = useCallback(async (calendarId: string) => {
    await setActiveCalendarService(calendarId);
    await refreshProfile();
  }, [refreshProfile]);

  return (
    <CalendarContext.Provider value={{
      calendars,
      activeCalendar,
      activeCalendarId: activeCalendar?.id || null,
      activeRole,
      loading,
      setActiveCalendar,
      refreshCalendars,
      hasCalendars: calendars.length > 0,
    }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  return useContext(CalendarContext);
}
