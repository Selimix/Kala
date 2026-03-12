import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { CATEGORIES, type EventCategory } from '../../constants/categories';
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
    location?: string;
    category?: EventCategory;
    people?: string[];
  };

  const category = CATEGORIES[input.category || 'autre'];

  return (
    <View style={[styles.card, { borderLeftColor: category.color }]}>
      <View style={styles.header}>
        <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
        <Text style={styles.category}>{category.label}</Text>
      </View>

      <Text style={styles.title}>{input.title}</Text>

      <View style={styles.detail}>
        <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
        <Text style={styles.detailText}>
          {input.start_time ? formatEventDateTime(input.start_time) : ''}
        </Text>
      </View>

      {input.location && (
        <View style={styles.detail}>
          <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{input.location}</Text>
        </View>
      )}

      {input.people && input.people.length > 0 && (
        <View style={styles.detail}>
          <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{input.people.join(', ')}</Text>
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
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  category: {
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
