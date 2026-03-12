import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuration du comportement des notifications en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('checkins', {
      name: 'Check-ins quotidiens',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

export async function scheduleMorningCheckin(hour: number, minute: number) {
  // Annuler les anciennes notifications du matin
  await cancelNotificationsByIdentifier('morning-checkin');

  await Notifications.scheduleNotificationAsync({
    identifier: 'morning-checkin',
    content: {
      title: 'Bonjour ! ☀️',
      body: 'Voici votre programme pour aujourd\'hui. Ouvrez Kala pour voir votre agenda.',
      data: { type: 'morning-checkin' },
      ...(Platform.OS === 'android' && { channelId: 'checkins' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleEveningCheckin(hour: number, minute: number) {
  // Annuler les anciennes notifications du soir
  await cancelNotificationsByIdentifier('evening-checkin');

  await Notifications.scheduleNotificationAsync({
    identifier: 'evening-checkin',
    content: {
      title: 'Bonsoir ! 🌙',
      body: 'Comment s\'est passée votre journée ? Mettez à jour votre agenda.',
      data: { type: 'evening-checkin' },
      ...(Platform.OS === 'android' && { channelId: 'checkins' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelNotificationsByIdentifier(identifier: string) {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hour: h, minute: m };
}

export async function scheduleAllCheckins(
  morningTime: string,
  eveningTime: string
) {
  const morning = parseTime(morningTime);
  const evening = parseTime(eveningTime);
  await scheduleMorningCheckin(morning.hour, morning.minute);
  await scheduleEveningCheckin(evening.hour, evening.minute);
}
