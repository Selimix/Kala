import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '../services/supabase';
import { getEventsForRange } from '../services/events';
import {
  syncEvents,
  requestCalendarPermission,
  isSyncEnabled,
} from '../services/device-calendar';

// Sync window: 3 months past → 6 months future
const SYNC_PAST_MONTHS = 3;
const SYNC_FUTURE_MONTHS = 6;

export function useCalendarSync() {
  const isSyncing = useRef(false);
  const permissionChecked = useRef(false);
  const permissionGranted = useRef(false);

  const performSync = useCallback(async () => {
    // Prevent concurrent syncs
    if (isSyncing.current) return;

    // Check if sync is enabled
    const enabled = await isSyncEnabled();
    if (!enabled) return;

    // Check permission once per session
    if (!permissionChecked.current) {
      permissionChecked.current = true;
      permissionGranted.current = await requestCalendarPermission();
    }
    if (!permissionGranted.current) return;

    isSyncing.current = true;
    try {
      const now = new Date();
      const start = new Date(now);
      start.setMonth(start.getMonth() - SYNC_PAST_MONTHS);
      const end = new Date(now);
      end.setMonth(end.getMonth() + SYNC_FUTURE_MONTHS);

      const events = await getEventsForRange(
        start.toISOString(),
        end.toISOString()
      );
      await syncEvents(events);
    } catch (error) {
      console.error('Erreur sync calendrier natif:', error);
    } finally {
      isSyncing.current = false;
    }
  }, []);

  // Sync on mount
  useEffect(() => {
    performSync();
  }, [performSync]);

  // Sync when Realtime fires (any change to events table)
  useEffect(() => {
    const channel = supabase
      .channel('calendar-sync-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          performSync();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [performSync]);

  // Sync when app returns to foreground
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        performSync();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [performSync]);

  return { syncNow: performSync };
}
