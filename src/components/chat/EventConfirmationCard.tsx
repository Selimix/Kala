import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { ACTIVITY_TYPES, type ActivityType } from '../../constants/activity-types';
import { formatEventDateTime } from '../../utils/date';
import type { ToolCall } from '../../types/chat';

interface Props {
  toolCall: ToolCall;
}

export function EventConfirmationCard({ toolCall }: Props) {
  const input = toolCall.input as {
    title?: string;
    start_time?: string;
    end_time?: string;
    activity_type?: ActivityType;
    place_name?: string;
    people_names?: string[];
    // Legacy fields
    location?: string;
    category?: string;
    people?: string[];
  };

  // Prefer new fields, fallback to legacy
  const activityType = input.activity_type || 'autre';
  const activityConfig = ACTIVITY_TYPES[activityType] || ACTIVITY_TYPES.autre;
  const locationText = input.place_name || input.location;
  const peopleList = input.people_names || input.people;

  return (
    <View style={[styles.card, { borderLeftColor: activityConfig.color }]}>
      <View style={styles.header}>
        <Ionicons
          name={activityConfig.icon as any}
          size={14}
          color={activityConfig.color}
          style={styles.headerIcon}
        />
        <Text style={styles.activityLabel}>{activityConfig.label}</Text>
      </View>

      <Text style={styles.title}>{input.title}</Text>

      <View style={styles.detail}>
        <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
        <Text style={styles.detailText}>
          {input.start_time ? formatEventDateTime(input.start_time) : ''}
        </Text>
      </View>

      {locationText && (
        <View style={styles.detail}>
          <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{locationText}</Text>
        </View>
      )}

      {peopleList && peopleList.length > 0 && (
        <View style={styles.detail}>
          <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{peopleList.join(', ')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIcon: {
    marginRight: 6,
  },
  activityLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
