import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { formatEventTime } from '../../utils/date';
import type { Task } from '../../types/tasks';

const PRIORITY_CONFIG = {
  low: { label: 'Basse', color: '#ADB5BD', icon: 'arrow-down' as const },
  medium: { label: 'Moyenne', color: '#FDCB6E', icon: 'remove' as const },
  high: { label: 'Haute', color: '#E17055', icon: 'arrow-up' as const },
  urgent: { label: 'Urgente', color: '#D63031', icon: 'alert-circle' as const },
};

const STATUS_ICON = {
  pending: 'ellipse-outline' as const,
  in_progress: 'time-outline' as const,
  completed: 'checkmark-circle' as const,
};

interface Props {
  task: Task;
}

export function TaskCard({ task }: Props) {
  const config = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isCompleted = task.status === 'completed';

  return (
    <View style={[styles.card, { borderLeftColor: isCompleted ? Colors.success : config.color }]}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={STATUS_ICON[task.status] || 'ellipse-outline'}
          size={22}
          color={isCompleted ? Colors.success : config.color}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, isCompleted && styles.titleCompleted]} numberOfLines={1}>
            {task.title}
          </Text>
          {task.category && (
            <View style={[styles.categoryBadge, { backgroundColor: task.category.color + '20' }]}>
              <Text style={[styles.categoryText, { color: task.category.color }]}>
                {task.category.name.split(' / ')[0]}
              </Text>
            </View>
          )}
          <View style={[styles.priorityBadge, { backgroundColor: config.color + '20' }]}>
            <Text style={[styles.priorityText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>

        {task.description && (
          <Text style={styles.description} numberOfLines={1}>{task.description}</Text>
        )}

        <View style={styles.detailRow}>
          {task.due_date && (
            <View style={styles.detail}>
              <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.detailText}>
                {formatEventTime(task.due_date)}
              </Text>
            </View>
          )}
          {task.is_private && (
            <View style={styles.detail}>
              <Ionicons name="lock-closed" size={12} color={Colors.textLight} />
              <Text style={styles.detailText}>Privée</Text>
            </View>
          )}
        </View>
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
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
