import { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CalendarView } from '../../components/calendar/CalendarView';
import { EventCard } from '../../components/calendar/EventCard';
import { TaskCard } from '../../components/calendar/TaskCard';
import { useEvents } from '../../hooks/useEvents';
import { useCalendar } from '../../hooks/useCalendar';
import { getTasksForDate, getPendingTasks } from '../../services/tasks';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/colors';
import { Strings } from '../../constants/strings.fr';
import type { CalendarEvent } from '../../types/events';
import type { Task } from '../../types/tasks';

type TabMode = 'events' | 'tasks';

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [tab, setTab] = useState<TabMode>('events');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const { events, loading } = useEvents(selectedDate);
  const { activeCalendarId } = useCalendar();

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const data = await getPendingTasks(activeCalendarId || undefined);
      setTasks(data);
    } catch (error) {
      console.error('Erreur chargement tâches:', error);
    } finally {
      setTasksLoading(false);
    }
  }, [activeCalendarId]);

  useEffect(() => {
    if (tab === 'tasks') fetchTasks();
  }, [tab, fetchTasks]);

  // Realtime for tasks
  useEffect(() => {
    const channel = supabase
      .channel('calendar-tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => { if (tab === 'tasks') fetchTasks(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks, tab]);

  const renderEvent = useCallback(
    ({ item }: { item: CalendarEvent }) => <EventCard event={item} />,
    []
  );

  const renderTask = useCallback(
    ({ item }: { item: Task }) => <TaskCard task={item} />,
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <CalendarView
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        events={events}
      />

      {/* Toggle Événements / Tâches */}
      <View style={styles.toggleContainer}>
        <Pressable
          style={[styles.toggleButton, tab === 'events' && styles.toggleActive]}
          onPress={() => setTab('events')}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={tab === 'events' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.toggleText, tab === 'events' && styles.toggleTextActive]}>
            Événements
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, tab === 'tasks' && styles.toggleActive]}
          onPress={() => setTab('tasks')}
        >
          <Ionicons
            name="checkbox-outline"
            size={16}
            color={tab === 'tasks' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.toggleText, tab === 'tasks' && styles.toggleTextActive]}>
            Tâches
          </Text>
          {tasks.length > 0 && tab !== 'tasks' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tasks.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.listContainer}>
        {tab === 'events' ? (
          events.length === 0 && !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{Strings.calendar.noEvents}</Text>
            </View>
          ) : (
            <FlatList
              data={events}
              renderItem={renderEvent}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : (
          tasks.length === 0 && !tasksLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune tâche en cours</Text>
            </View>
          ) : (
            <FlatList
              data={tasks}
              renderItem={renderTask}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  toggleActive: {
    backgroundColor: Colors.primary + '15',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
