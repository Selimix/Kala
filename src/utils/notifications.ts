import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { CalendarEvent } from '../types/events';
import type { Task } from '../types/tasks';
import { Strings } from '../constants/strings.fr';

// Configuration du comportement des notifications en foreground
// (expo-notifications n'est pas disponible sur le web)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ============================================================
// Permissions
// ============================================================

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

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
    await Notifications.setNotificationChannelAsync('event-reminders', {
      name: 'Rappels d\'événements',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

// ============================================================
// Helpers
// ============================================================

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hour: h, minute: m };
}

function formatEventTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// Smart check-ins (contenu adapté selon l'agenda)
// ============================================================

export async function scheduleSmartMorningCheckin(
  hour: number,
  minute: number,
  todayEvents: CalendarEvent[],
  pendingTasks: Task[] = []
) {
  await cancelNotificationsByIdentifier('morning-checkin');

  let body: string;
  if (todayEvents.length === 0 && pendingTasks.length === 0) {
    body = Strings.notifications.morningEmpty;
  } else {
    const parts: string[] = [];
    if (todayEvents.length > 0) {
      const first = todayEvents[0];
      const time = first.is_all_day ? 'toute la journee' : formatEventTime(first.start_time);
      parts.push(`${todayEvents.length} evenement${todayEvents.length > 1 ? 's' : ''}, premier : ${first.title} a ${time}`);
    }
    if (pendingTasks.length > 0) {
      const urgentCount = pendingTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
      parts.push(`${pendingTasks.length} tache${pendingTasks.length > 1 ? 's' : ''} en cours${urgentCount > 0 ? ` (${urgentCount} prioritaire${urgentCount > 1 ? 's' : ''})` : ''}`);
    }
    body = parts.join('. ') + '.';
  }

  await Notifications.scheduleNotificationAsync({
    identifier: 'morning-checkin',
    content: {
      title: Strings.notifications.morningTitle,
      body,
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

export async function scheduleSmartEveningCheckin(
  hour: number,
  minute: number,
  tomorrowEvents: CalendarEvent[],
  tasksDueTomorrow: Task[] = []
) {
  await cancelNotificationsByIdentifier('evening-checkin');

  let body: string;
  if (tomorrowEvents.length === 0 && tasksDueTomorrow.length === 0) {
    body = Strings.notifications.eveningEmpty;
  } else {
    const parts: string[] = [];
    if (tomorrowEvents.length > 0) {
      const first = tomorrowEvents[0];
      const time = first.is_all_day ? 'toute la journee' : formatEventTime(first.start_time);
      parts.push(`${tomorrowEvents.length} evenement${tomorrowEvents.length > 1 ? 's' : ''}, premier : ${first.title} a ${time}`);
    }
    if (tasksDueTomorrow.length > 0) {
      parts.push(`${tasksDueTomorrow.length} tache${tasksDueTomorrow.length > 1 ? 's' : ''} a faire`);
    }
    body = 'Demain : ' + parts.join('. ') + '.';
  }

  await Notifications.scheduleNotificationAsync({
    identifier: 'evening-checkin',
    content: {
      title: Strings.notifications.eveningTitle,
      body,
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

// ============================================================
// Rappels d'événements (15 min avant)
// ============================================================

const REMINDER_LEAD_MS = 15 * 60 * 1000; // 15 minutes

export async function scheduleEventReminders(events: CalendarEvent[]) {
  // Annuler tous les rappels existants
  await cancelEventReminders();

  const now = Date.now();

  for (const event of events) {
    if (event.is_all_day) continue; // Pas de rappel pour les événements toute la journée

    const startMs = new Date(event.start_time).getTime();
    const reminderMs = startMs - REMINDER_LEAD_MS;

    // Ne scheduler que si le rappel est dans le futur et dans les prochaines 24h
    if (reminderMs <= now) continue;
    if (reminderMs - now > 24 * 60 * 60 * 1000) continue;

    const locationText = event.place?.name || event.location;
    const body = locationText
      ? `Dans 15 min : ${event.title} — ${locationText}`
      : `Dans 15 min : ${event.title}`;

    await Notifications.scheduleNotificationAsync({
      identifier: `event-reminder-${event.id}`,
      content: {
        title: Strings.notifications.eventReminderTitle,
        body,
        data: { type: 'event-reminder', eventId: event.id },
        ...(Platform.OS === 'android' && { channelId: 'event-reminders' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(reminderMs),
      },
    });
  }
}

export async function cancelEventReminders() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier.startsWith('event-reminder-')) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch {
    // Silencieux si erreur (ex: aucune notification schedulée)
  }
}

// ============================================================
// Rappels de taches (veille + jour)
// ============================================================

export async function scheduleTaskDueReminders(tasks: Task[]) {
  await cancelTaskReminders();

  const now = Date.now();

  for (const task of tasks) {
    if (!task.due_date) continue;
    if (task.status === 'completed') continue;

    const dueMs = new Date(task.due_date).getTime();
    const dayBeforeMs = dueMs - 24 * 60 * 60 * 1000; // Veille
    const twoHoursBeforeMs = dueMs - 2 * 60 * 60 * 1000; // 2h avant

    // Rappel la veille
    if (dayBeforeMs > now && dayBeforeMs - now < 48 * 60 * 60 * 1000) {
      await Notifications.scheduleNotificationAsync({
        identifier: `task-due-eve-${task.id}`,
        content: {
          title: Strings.notifications.taskDueEveTitle,
          body: `Demain : "${task.title}"${task.priority === 'urgent' ? ' (URGENT)' : ''}`,
          data: { type: 'task-due-reminder', taskId: task.id },
          ...(Platform.OS === 'android' && { channelId: 'event-reminders' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(dayBeforeMs),
        },
      });
    }

    // Rappel le jour meme (2h avant)
    if (twoHoursBeforeMs > now && twoHoursBeforeMs - now < 48 * 60 * 60 * 1000) {
      await Notifications.scheduleNotificationAsync({
        identifier: `task-due-day-${task.id}`,
        content: {
          title: Strings.notifications.taskDueTodayTitle,
          body: `Echeance dans 2h : "${task.title}"`,
          data: { type: 'task-due-reminder', taskId: task.id },
          ...(Platform.OS === 'android' && { channelId: 'event-reminders' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(twoHoursBeforeMs),
        },
      });
    }
  }
}

export async function cancelTaskReminders() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier.startsWith('task-due-')) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch {
    // Silencieux
  }
}

// ============================================================
// Fonction principale (utilisée par useNotifications)
// ============================================================

export async function scheduleAllSmartNotifications(
  morningTime: string,
  eveningTime: string,
  todayEvents: CalendarEvent[],
  tomorrowEvents: CalendarEvent[],
  pendingTasks: Task[] = [],
  tasksDueTomorrow: Task[] = [],
  tasksWithDueDates: Task[] = []
) {
  const morning = parseTime(morningTime);
  const evening = parseTime(eveningTime);

  await scheduleSmartMorningCheckin(morning.hour, morning.minute, todayEvents, pendingTasks);
  await scheduleSmartEveningCheckin(evening.hour, evening.minute, tomorrowEvents, tasksDueTomorrow);
  await scheduleEventReminders([...todayEvents, ...tomorrowEvents]);
  await scheduleTaskDueReminders(tasksWithDueDates);
}

// ============================================================
// Cancel helpers
// ============================================================

export async function cancelNotificationsByIdentifier(identifier: string) {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllNotifications() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Rétrocompat — l'ancien nom
export async function scheduleAllCheckins(
  morningTime: string,
  eveningTime: string
) {
  const morning = parseTime(morningTime);
  const evening = parseTime(eveningTime);
  await scheduleSmartMorningCheckin(morning.hour, morning.minute, []);
  await scheduleSmartEveningCheckin(evening.hour, evening.minute, []);
}
