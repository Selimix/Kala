import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CalendarEvent } from '../types/events';
import { Colors } from '../constants/colors';

// Import conditionnel — expo-calendar n'est pas disponible sur le web
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Calendar: any = null;
if (Platform.OS !== 'web') {
  Calendar = require('expo-calendar');
}

// ============================================================
// Constants
// ============================================================

const KALA_CALENDAR_TITLE = 'Kāla काल AI';
const KALA_CALENDAR_COLOR = Colors.primary;
const STORAGE_KEY_CALENDAR_ID = '@kala/native-calendar-id';
const STORAGE_KEY_EVENT_MAP = '@kala/event-map';
const STORAGE_KEY_SYNC_ENABLED = '@kala/sync-enabled';

// ============================================================
// Types
// ============================================================

interface EventSyncEntry {
  nativeEventId: string;
  lastSyncedAt: string; // ISO timestamp — tracks event.updated_at at time of sync
}

interface EventSyncMap {
  [supabaseEventId: string]: EventSyncEntry;
}

// ============================================================
// Permissions
// ============================================================

export async function requestCalendarPermission(): Promise<boolean> {
  if (Platform.OS === 'web' || !Calendar) return false;
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

export async function checkCalendarPermission(): Promise<boolean> {
  if (Platform.OS === 'web' || !Calendar) return false;
  const { status } = await Calendar.getCalendarPermissionsAsync();
  return status === 'granted';
}

// ============================================================
// Calendar Management
// ============================================================

async function getOrCreateKalaCalendar(): Promise<string> {
  // Check if we have a stored calendar ID
  const storedId = await AsyncStorage.getItem(STORAGE_KEY_CALENDAR_ID);

  if (storedId) {
    // Verify it still exists
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const exists = calendars.find((c: any) => c.id === storedId);
      if (exists) return storedId;
    } catch {
      // Calendar no longer exists, we'll create a new one
    }
  }

  // Create a new "Kala" calendar
  let calendarId: string;

  if (Platform.OS === 'ios') {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    calendarId = await Calendar.createCalendarAsync({
      title: KALA_CALENDAR_TITLE,
      color: KALA_CALENDAR_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendar.source.id,
      source: defaultCalendar.source,
      name: KALA_CALENDAR_TITLE,
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  } else {
    // Android
    calendarId = await Calendar.createCalendarAsync({
      title: KALA_CALENDAR_TITLE,
      color: KALA_CALENDAR_COLOR,
      name: KALA_CALENDAR_TITLE,
      source: {
        isLocalAccount: true,
        name: KALA_CALENDAR_TITLE,
        type: 'LOCAL',
      },
      ownerAccount: 'Kāla',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  }

  await AsyncStorage.setItem(STORAGE_KEY_CALENDAR_ID, calendarId);
  return calendarId;
}

// ============================================================
// Event Mapping Store (AsyncStorage)
// ============================================================

async function loadEventMap(): Promise<EventSyncMap> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_EVENT_MAP);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as EventSyncMap;
  } catch {
    return {};
  }
}

async function saveEventMap(map: EventSyncMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_EVENT_MAP, JSON.stringify(map));
}

// ============================================================
// Kala Event → Native Calendar Event mapping
// ============================================================

function mapKalaEventToNative(event: CalendarEvent) {
  // Build notes with people and category if available
  const notes: string[] = [];
  if (event.description) notes.push(event.description);
  if (event.people && event.people.length > 0) {
    notes.push(`Participants : ${event.people.join(', ')}`);
  }

  return {
    title: event.title,
    notes: notes.join('\n'),
    startDate: new Date(event.start_time),
    endDate: new Date(event.end_time),
    location: event.location || '',
    allDay: event.is_all_day,
    timeZone: 'Europe/Paris',
  };
}

// ============================================================
// Native CRUD Operations
// ============================================================

async function createNativeEvent(
  calendarId: string,
  event: CalendarEvent
): Promise<string> {
  const nativeEventId = await Calendar.createEventAsync(
    calendarId,
    mapKalaEventToNative(event)
  );
  return nativeEventId;
}

async function updateNativeEvent(
  calendarId: string,
  nativeEventId: string,
  event: CalendarEvent
): Promise<string> {
  try {
    await Calendar.updateEventAsync(nativeEventId, mapKalaEventToNative(event));
    return nativeEventId;
  } catch {
    // Event was deleted from native calendar — recreate it
    const newId = await Calendar.createEventAsync(
      calendarId,
      mapKalaEventToNative(event)
    );
    return newId;
  }
}

async function deleteNativeEvent(nativeEventId: string): Promise<void> {
  try {
    await Calendar.deleteEventAsync(nativeEventId);
  } catch {
    // Event already deleted, ignore
  }
}

// ============================================================
// Main Sync Function — Reconciliation
// ============================================================

export async function syncEvents(events: CalendarEvent[]): Promise<void> {
  // expo-calendar n'est pas disponible sur le web
  if (Platform.OS === 'web' || !Calendar) return;

  // Check if sync is enabled
  const enabled = await isSyncEnabled();
  if (!enabled) return;

  // Check permission
  const hasPermission = await checkCalendarPermission();
  if (!hasPermission) return;

  // Get or create the Kala calendar
  const calendarId = await getOrCreateKalaCalendar();

  // Load current mapping
  const eventMap = await loadEventMap();

  // Build set of current Supabase event IDs
  const currentIds = new Set(events.map((e) => e.id));

  // --- CREATE: events in Supabase but not in mapping ---
  for (const event of events) {
    if (!eventMap[event.id]) {
      try {
        const nativeId = await createNativeEvent(calendarId, event);
        eventMap[event.id] = {
          nativeEventId: nativeId,
          lastSyncedAt: event.updated_at,
        };
      } catch (error) {
        console.error(`Erreur sync create ${event.id}:`, error);
      }
    }
  }

  // --- UPDATE: events that exist in both but have changed ---
  for (const event of events) {
    const mapping = eventMap[event.id];
    if (mapping && mapping.lastSyncedAt !== event.updated_at) {
      try {
        const newNativeId = await updateNativeEvent(
          calendarId,
          mapping.nativeEventId,
          event
        );
        eventMap[event.id] = {
          nativeEventId: newNativeId,
          lastSyncedAt: event.updated_at,
        };
      } catch (error) {
        console.error(`Erreur sync update ${event.id}:`, error);
      }
    }
  }

  // --- DELETE: mappings for events that no longer exist in Supabase ---
  for (const supabaseId of Object.keys(eventMap)) {
    if (!currentIds.has(supabaseId)) {
      try {
        await deleteNativeEvent(eventMap[supabaseId].nativeEventId);
      } catch (error) {
        console.error(`Erreur sync delete ${supabaseId}:`, error);
      }
      delete eventMap[supabaseId];
    }
  }

  // Save updated mapping
  await saveEventMap(eventMap);
}

// ============================================================
// Sync Preferences
// ============================================================

export async function isSyncEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEY_SYNC_ENABLED);
  return value !== 'false'; // default to true
}

export async function setSyncEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_SYNC_ENABLED, String(enabled));
}

// ============================================================
// Cleanup (for logout)
// ============================================================

export async function clearSyncData(): Promise<void> {
  try {
    // Optionally delete the Kala calendar from the device
    if (Platform.OS !== 'web' && Calendar) {
      const storedId = await AsyncStorage.getItem(STORAGE_KEY_CALENDAR_ID);
      if (storedId) {
        try {
          await Calendar.deleteCalendarAsync(storedId);
        } catch {
          // Calendar might already be deleted
        }
      }
    }
  } finally {
    // Always clear local storage
    await AsyncStorage.removeItem(STORAGE_KEY_CALENDAR_ID);
    await AsyncStorage.removeItem(STORAGE_KEY_EVENT_MAP);
    await AsyncStorage.removeItem(STORAGE_KEY_SYNC_ENABLED);
  }
}
