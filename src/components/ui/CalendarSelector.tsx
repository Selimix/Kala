import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Strings } from '../../constants/strings.fr';
import type { CalendarWithRole } from '../../types/calendars';

interface Props {
  calendars: CalendarWithRole[];
  activeCalendarId: string | null;
  onSelect: (calendarId: string) => void;
}

export function CalendarSelector({ calendars, activeCalendarId, onSelect }: Props) {
  const [visible, setVisible] = useState(false);

  const activeCalendar = calendars.find(c => c.id === activeCalendarId) || calendars[0];

  if (!activeCalendar) return null;

  const roleLabel = Strings.calendars.roles[activeCalendar.role] || '';

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.emoji}>{activeCalendar.emoji}</Text>
        <View style={styles.triggerTextContainer}>
          <Text style={styles.triggerName} numberOfLines={1}>
            {activeCalendar.name}
          </Text>
          <Text style={styles.triggerRole}>{roleLabel}</Text>
        </View>
        {calendars.length > 1 && (
          <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
        )}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>{Strings.calendars.title}</Text>
            <FlatList
              data={calendars}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const isActive = item.id === activeCalendarId;
                return (
                  <TouchableOpacity
                    style={[styles.item, isActive && styles.itemActive]}
                    onPress={() => {
                      onSelect(item.id);
                      setVisible(false);
                    }}
                  >
                    <Text style={styles.itemEmoji}>{item.emoji}</Text>
                    <View style={styles.itemTextContainer}>
                      <Text style={[styles.itemName, isActive && styles.itemNameActive]}>
                        {item.name}
                      </Text>
                      <Text style={styles.itemRole}>
                        {Strings.calendars.roles[item.role]}
                      </Text>
                    </View>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.authGold} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  emoji: {
    fontSize: 18,
  },
  triggerTextContainer: {
    maxWidth: 120,
  },
  triggerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.authTitle,
  },
  triggerRole: {
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  dropdown: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    maxHeight: 320,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  itemActive: {
    backgroundColor: Colors.authGold + '10',
  },
  itemEmoji: {
    fontSize: 22,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  itemNameActive: {
    color: Colors.authGold,
    fontWeight: '700',
  },
  itemRole: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
