import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { formatEventDateTime } from '../../utils/date';
import type { ToolCall } from '../../types/chat';

const PRIORITY_CONFIG = {
  low: { label: 'Basse', color: '#ADB5BD', icon: 'arrow-down' as const },
  medium: { label: 'Moyenne', color: '#FDCB6E', icon: 'remove' as const },
  high: { label: 'Haute', color: '#E17055', icon: 'arrow-up' as const },
  urgent: { label: 'Urgente', color: '#D63031', icon: 'alert-circle' as const },
};

interface Props {
  toolCall: ToolCall;
}

export function TaskConfirmationCard({ toolCall }: Props) {
  const input = toolCall.input as {
    title?: string;
    description?: string;
    due_date?: string;
    priority?: keyof typeof PRIORITY_CONFIG;
    task_id?: string;
    category_name?: string;
    is_private?: boolean;
    name?: string; // for create_task_category
    updates?: {
      title?: string;
      status?: string;
      priority?: string;
      category_name?: string;
      is_private?: boolean;
    };
  };

  // Handle create_task_category tool
  if (toolCall.name === 'create_task_category') {
    return (
      <View style={[styles.card, { borderLeftColor: Colors.primary }]}>
        <View style={styles.header}>
          <Ionicons name="pricetag" size={14} color={Colors.primary} style={styles.headerIcon} />
          <Text style={styles.label}>Catégorie créée</Text>
        </View>
        <Text style={styles.title}>{input.name || 'Catégorie'}</Text>
      </View>
    );
  }

  const title = input.title || input.updates?.title || 'Tache';
  const priority = (input.priority || input.updates?.priority || 'medium') as keyof typeof PRIORITY_CONFIG;
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  const isComplete = toolCall.name === 'complete_task';
  const categoryName = input.category_name || input.updates?.category_name;
  const isPrivate = input.is_private || input.updates?.is_private;

  return (
    <View style={[styles.card, { borderLeftColor: isComplete ? Colors.success : config.color }]}>
      <View style={styles.header}>
        <Ionicons
          name={isComplete ? 'checkmark-circle' : 'checkbox-outline'}
          size={14}
          color={isComplete ? Colors.success : config.color}
          style={styles.headerIcon}
        />
        <Text style={styles.label}>
          {isComplete ? 'Tache terminee' : `Priorite ${config.label}`}
        </Text>
      </View>

      <Text style={[styles.title, isComplete && styles.titleCompleted]}>{title}</Text>

      {categoryName && (
        <View style={styles.detail}>
          <Ionicons name="pricetag" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{categoryName}</Text>
        </View>
      )}

      {isPrivate && (
        <View style={styles.detail}>
          <Ionicons name="lock-closed" size={14} color={Colors.textLight} />
          <Text style={styles.detailText}>Tâche privée</Text>
        </View>
      )}

      {input.due_date && (
        <View style={styles.detail}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>
            Echeance : {formatEventDateTime(input.due_date)}
          </Text>
        </View>
      )}

      {input.description && (
        <View style={styles.detail}>
          <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText} numberOfLines={2}>{input.description}</Text>
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
  label: {
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
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
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
