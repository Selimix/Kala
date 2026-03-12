import { useEffect, useRef } from 'react';
import { type EventSubscription } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuth } from './useAuth';
import {
  requestNotificationPermissions,
  scheduleAllCheckins,
  cancelAllNotifications,
} from '../utils/notifications';

export function useNotifications() {
  const { profile } = useAuth();
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    if (!profile?.notifications_enabled) {
      cancelAllNotifications();
      return;
    }

    // Demander les permissions et planifier les notifications
    (async () => {
      const granted = await requestNotificationPermissions();
      if (!granted) return;

      await scheduleAllCheckins(
        profile.morning_checkin_time || '08:00',
        profile.evening_checkin_time || '20:00'
      );
    })();

    // Reagir quand l'utilisateur tape sur une notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'morning-checkin' || data?.type === 'evening-checkin') {
          router.push('/(tabs)/chat');
        }
      });

    return () => {
      responseListener.current?.remove();
    };
  }, [
    profile?.notifications_enabled,
    profile?.morning_checkin_time,
    profile?.evening_checkin_time,
  ]);
}
