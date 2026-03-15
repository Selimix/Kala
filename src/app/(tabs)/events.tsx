import { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, SectionList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EventCard } from '../../components/calendar/EventCard';
import { useCalendar } from '../../hooks/useCalendar';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/colors';
import { formatEventDate } from '../../utils/date';
import type { CalendarEvent } from '../../types/events';

export default function EventsScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCalendarId } = useCalendar();

  const fetchUpcoming = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      let query = supabase
        .from('events')
        .select('*, place:places(name), creator:profiles!created_by(display_name), event_personas:events_personas(persona:personas(name))')
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(50);

      if (activeCalendarId) {
        query = query.or(`calendar_id.eq.${activeCalendarId},calendar_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Erreur chargement rendez-vous:', error);
    } finally {
      setLoading(false);
    }
  }, [activeCalendarId]);

  useEffect(() => {
    fetchUpcoming();
  }, [fetchUpcoming]);

  useEffect(() => {
    const channel = supabase
      .channel('events-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchUpcoming();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchUpcoming]);

  // Group events by date
  const sections = events.reduce<{ title: string; data: CalendarEvent[] }[]>((acc, event) => {
    const dateKey = event.start_time.split('T')[0];
    const dateLabel = formatEventDate(event.start_time);
    const existing = acc.find(s => s.title === dateLabel);
    if (existing) {
      existing.data.push(event);
    } else {
      acc.push({ title: dateLabel, data: [event] });
    }
    return acc;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {events.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={Colors.textLight} />
          <Text style={styles.emptyText}>Aucun rendez-vous à venir</Text>
          <Text style={styles.emptyHint}>
            Demandez à l'assistant de planifier un événement
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={({ item }) => <EventCard event={item} />}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
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
  list: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'capitalize',
    marginTop: 16,
    marginBottom: 6,
    paddingHorizontal: 4,
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
