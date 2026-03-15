import { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TaskCard } from '../../components/calendar/TaskCard';
import { useCalendar } from '../../hooks/useCalendar';
import { getTasks } from '../../services/tasks';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/colors';
import type { Task, TaskStatus } from '../../types/tasks';

type FilterTab = 'active' | 'completed';

export default function TasksScreen() {
  const [filter, setFilter] = useState<FilterTab>('active');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCalendarId } = useCalendar();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTasks(activeCalendarId || undefined);
      setTasks(data);
    } catch (error) {
      console.error('Erreur chargement tâches:', error);
    } finally {
      setLoading(false);
    }
  }, [activeCalendarId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const channel = supabase
      .channel('tasks-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  const filtered = tasks.filter(t =>
    filter === 'active'
      ? t.status !== 'completed'
      : t.status === 'completed'
  );

  const activeCount = tasks.filter(t => t.status !== 'completed').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterBtn, filter === 'active' && styles.filterActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            En cours ({activeCount})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterBtn, filter === 'completed' && styles.filterActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Terminées ({completedCount})
          </Text>
        </Pressable>
      </View>

      {filtered.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={filter === 'active' ? 'checkbox-outline' : 'checkmark-done-circle-outline'}
            size={48}
            color={Colors.textLight}
          />
          <Text style={styles.emptyText}>
            {filter === 'active' ? 'Aucune tâche en cours' : 'Aucune tâche terminée'}
          </Text>
          {filter === 'active' && (
            <Text style={styles.emptyHint}>
              Demandez à l'assistant de créer une tâche
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={({ item }) => <TaskCard task={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterActive: {
    backgroundColor: Colors.primary + '15',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.textLight,
  },
});
