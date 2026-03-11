import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { CATEGORIES } from '../../constants/categories';
import type { CalendarEvent } from '../../types/events';

interface Props {
  event: CalendarEvent;
}

export function EventCard({ event }: Props) {
  const category = CATEGORIES[event.category];

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.card, { borderLeftColor: category.color }]}>
      <View style={styles.timeContainer}>
        <Text style={styles.time}>
          {event.is_all_day ? 'Journée' : formatTime(event.start_time)}
        </Text>
        {!event.is_all_day && (
          <Text style={styles.timeSeparator}>
            {formatTime(event.end_time)}
          </Text>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        {event.location && (
          <View style={styles.detail}>
            <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.detailText} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        )}
        {event.people.length > 0 && (
          <View style={styles.detail}>
            <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.detailText} numberOfLines={1}>
              {event.people.join(', ')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  timeContainer: {
    width: 56,
    marginRight: 12,
    justifyContent: 'center',
  },
  time: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  timeSeparator: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
