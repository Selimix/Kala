import { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { type EventSubscription } from 'expo-modules-core';
import { router } from 'expo-router';
import { useAuth } from './useAuth';
import { useCalendar } from './useCalendar';
import { supabase } from '../services/supabase';
import { getEventsForDate } from '../services/events';
import { getPendingTasks, getTasksForDate } from '../services/tasks';

// Import conditionnel — expo-notifications n'est pas disponible sur le web
let Notifications: typeof import('expo-notifications') | null = null;
let notificationsUtils: typeof import('../utils/notifications') | null = null;

if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  notificationsUtils = require('../utils/notifications');
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getTomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function useNotifications() {
  const { profile } = useAuth();
  const { activeCalendarId } = useCalendar();
  const responseListener = useRef<EventSubscription | null>(null);
  const isRefreshing = useRef(false);

  // ── Refresh notifications intelligentes ──
  const refreshNotifications = useCallback(async () => {
    if (Platform.OS === 'web' || !notificationsUtils) return;
    if (!profile?.notifications_enabled) return;
    if (isRefreshing.current) return;

    isRefreshing.current = true;
    try {
      const today = getTodayStr();
      const tomorrow = getTomorrowStr();
      const calId = activeCalendarId || undefined;

      const [todayEvents, tomorrowEvents, pendingTasks, tasksDueTomorrow] = await Promise.all([
        getEventsForDate(today, calId),
        getEventsForDate(tomorrow, calId),
        getPendingTasks(calId),
        getTasksForDate(tomorrow, calId),
      ]);

      // Taches avec echeance (pour rappels veille/jour)
      const tasksWithDueDates = pendingTasks.filter(t => t.due_date != null);

      await notificationsUtils.scheduleAllSmartNotifications(
        profile.morning_checkin_time || '08:00',
        profile.evening_checkin_time || '20:00',
        todayEvents,
        tomorrowEvents,
        pendingTasks,
        tasksDueTomorrow,
        tasksWithDueDates
      );
    } catch (err) {
      console.error('Erreur refresh notifications:', err);
    } finally {
      isRefreshing.current = false;
    }
  }, [
    profile?.notifications_enabled,
    profile?.morning_checkin_time,
    profile?.evening_checkin_time,
    activeCalendarId,
  ]);

  // ── Init : permissions + premier scheduling ──
  useEffect(() => {
    if (Platform.OS === 'web' || !Notifications || !notificationsUtils) return;

    if (!profile?.notifications_enabled) {
      notificationsUtils.cancelAllNotifications();
      return;
    }

    (async () => {
      const granted = await notificationsUtils.requestNotificationPermissions();
      if (!granted) return;
      await refreshNotifications();
    })();

    // Réagir quand l'utilisateur tape sur une notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'morning-checkin' || data?.type === 'evening-checkin') {
          router.push('/(tabs)/chat');
        } else if (data?.type === 'event-reminder') {
          router.push('/(tabs)/calendar');
        } else if (data?.type === 'task-due-reminder') {
          router.push('/(tabs)/chat');
        }
      });

    return () => {
      responseListener.current?.remove();
    };
  }, [
    profile?.notifications_enabled,
    refreshNotifications,
  ]);

  // ── Realtime : re-scheduler quand les events changent ──
  useEffect(() => {
    if (Platform.OS === 'web' || !profile?.notifications_enabled) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          refreshNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshNotifications, profile?.notifications_enabled]);

  // ── Realtime : re-scheduler quand les tasks changent ──
  useEffect(() => {
    if (Platform.OS === 'web' || !profile?.notifications_enabled) return;

    const channel = supabase
      .channel('notifications-tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          refreshNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshNotifications, profile?.notifications_enabled]);

  // ── Foreground : re-scheduler quand l'app revient ──
  useEffect(() => {
    if (Platform.OS === 'web' || !profile?.notifications_enabled) return;

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        refreshNotifications();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [refreshNotifications, profile?.notifications_enabled]);
}
