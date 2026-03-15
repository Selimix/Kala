import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { ACTIVITY_TYPES } from '../../constants/activity-types';
import { formatEventTime } from '../../utils/date';
import type { CalendarEvent } from '../../types/events';

interface Props {
  event: CalendarEvent;
}

export function EventCard({ event }: Props) {
  const activityConfig = ACTIVITY_TYPES[event.activity_type] || ACTIVITY_TYPES.autre;

  // Determine location text: prefer place entity, fallback to legacy location
  const locationText = event.place?.name || event.location;

  // Determine people text: prefer personas, fallback to legacy people[]
  const peopleText =
    event.event_personas && event.event_personas.length > 0
      ? event.event_personas.map(ep => ep.persona.name).join(', ')
      : event.people.length > 0
        ? event.people.join(', ')
        : null;

  return (
    <View style={[styles.card, { borderLeftColor: activityConfig.color }]}>
      <View style={styles.timeContainer}>
        <Text style={styles.time}>
          {event.is_all_day ? 'Journée' : formatEventTime(event.start_time)}
        </Text>
        {!event.is_all_day && (
          <Text style={styles.timeSeparator}>
            {formatEventTime(event.end_time)}
          </Text>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Ionicons
            name={activityConfig.icon as any}
            size={14}
            color={activityConfig.color}
            style={styles.activityIcon}
          />
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
        </View>
        {locationText && (
          <View style={styles.detail}>
            <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.detailText} numberOfLines={1}>
              {locationText}
            </Text>
          </View>
        )}
        {peopleText && (
          <View style={styles.detail}>
            <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.detailText} numberOfLines={1}>
              {peopleText}
            </Text>
          </View>
        )}
        {event.creator?.display_name && (
          <View style={styles.detail}>
            <Ionicons name="person-circle-outline" size={12} color={Colors.textLight} />
            <Text style={[styles.detailText, styles.creatorText]} numberOfLines={1}>
              {event.creator.display_name}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityIcon: {
    marginRight: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
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
  creatorText: {
    color: Colors.textLight,
    fontStyle: 'italic',
  },
});
