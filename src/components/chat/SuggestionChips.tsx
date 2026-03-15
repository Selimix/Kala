import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface Option {
  label: string;
  icon?: string;
}

interface Props {
  options: Option[];
  question?: string;
  multiSelect?: boolean;
  selectedOptions?: string[];
  onSelect: (label: string) => void;
  disabled?: boolean;
}

export function SuggestionChips({
  options,
  question,
  multiSelect = false,
  selectedOptions = [],
  onSelect,
  disabled = false,
}: Props) {
  return (
    <View style={styles.container}>
      {question ? (
        <Text style={styles.question}>{question}</Text>
      ) : null}
      <View style={styles.chipsRow}>
        {options.map((opt, i) => {
          const isSelected = selectedOptions.includes(opt.label);
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                disabled && styles.chipDisabled,
              ]}
              onPress={() => !disabled && onSelect(opt.label)}
              activeOpacity={0.7}
              disabled={disabled}
            >
              {opt.icon ? (
                <Ionicons
                  name={opt.icon as any}
                  size={14}
                  color={isSelected ? '#FFF' : Colors.authGold}
                  style={styles.chipIcon}
                />
              ) : null}
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                  disabled && styles.chipTextDisabled,
                ]}
              >
                {opt.label}
              </Text>
              {isSelected && multiSelect ? (
                <Ionicons name="checkmark" size={14} color="#FFF" style={styles.checkIcon} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
  },
  question: {
    fontSize: 13,
    color: Colors.homeTextMuted,
    marginBottom: 6,
    fontWeight: '500',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(184, 149, 106, 0.1)',
    borderWidth: 1.5,
    borderColor: Colors.authGold,
  },
  chipSelected: {
    backgroundColor: Colors.authGold,
    borderColor: Colors.authGold,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipIcon: {
    marginRight: 4,
  },
  checkIcon: {
    marginLeft: 4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.authGold,
  },
  chipTextSelected: {
    color: '#FFF',
  },
  chipTextDisabled: {
    color: Colors.homeTextMuted,
  },
});
