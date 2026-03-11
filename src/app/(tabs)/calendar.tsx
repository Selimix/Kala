import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarView } from '../../components/calendar/CalendarView';
import { EventCard } from '../../components/calendar/EventCard';
import { useEvents } from '../../hooks/useEvents';
import { Colors } from '../../constants/colors';
import { Strings } from '../../constants/strings.fr';
import type { CalendarEvent } from '../../types/events';

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const { events, loading } = useEvents(selectedDate);

  const renderEvent = useCallback(
    ({ item }: { item: CalendarEvent }) => <EventCard event={item} />,
    []
  );

  const keyExtractor = useCallback((item: CalendarEvent) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <CalendarView
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        events={events}
      />
      <View style={styles.eventsContainer}>
        {events.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{Strings.calendar.noEvents}</Text>
          </View>
        ) : (
          <FlatList
            data={events}
            renderItem={renderEvent}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.eventsList}
            showsVerticalScrollIndicator={false}
          />
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
  eventsContainer: {
    flex: 1,
  },
  eventsList: {
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
