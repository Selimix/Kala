import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { type EventSubscription } from 'expo-modules-core';
import { router } from 'expo-router';
import { useAuth } from './useAuth';

// Import conditionnel — expo-notifications n'est pas disponible sur le web
let Notifications: typeof import('expo-notifications') | null = null;
let notificationsUtils: typeof import('../utils/notifications') | null = null;

if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  notificationsUtils = require('../utils/notifications');
}

export function useNotifications() {
  const { profile } = useAuth();
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    // expo-notifications n'est pas disponible sur le web
    if (Platform.OS === 'web' || !Notifications || !notificationsUtils) return;

    if (!profile?.notifications_enabled) {
      notificationsUtils.cancelAllNotifications();
      return;
    }

    // Demander les permissions et planifier les notifications
    (async () => {
      const granted = await notificationsUtils.requestNotificationPermissions();
      if (!granted) return;

      await notificationsUtils.scheduleAllCheckins(
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
