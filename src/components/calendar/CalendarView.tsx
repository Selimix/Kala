import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Colors } from '../../constants/colors';
import { ACTIVITY_TYPES } from '../../constants/activity-types';
import type { CalendarEvent } from '../../types/events';

// Configuration du calendrier en francais
LocaleConfig.locales['fr'] = {
  monthNames: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ],
  monthNamesShort: [
    'Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin',
    'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.',
  ],
  dayNames: [
    'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi',
  ],
  dayNamesShort: ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'],
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = 'fr';

interface Props {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  events: CalendarEvent[];
}

export function CalendarView({ selectedDate, onSelectDate, events }: Props) {
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    // Marquer les jours avec des evenements (dots par activity_type)
    events.forEach(event => {
      const date = event.start_time.split('T')[0];
      const activityConfig = ACTIVITY_TYPES[event.activity_type] || ACTIVITY_TYPES.autre;
      if (!marks[date]) {
        marks[date] = { dots: [] };
      }
      marks[date].dots.push({ color: activityConfig.color });
    });

    // Marquer le jour selectionne
    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: Colors.authGold,
    };

    return marks;
  }, [events, selectedDate]);

  return (
    <Calendar
      current={selectedDate}
      onDayPress={(day: { dateString: string }) => onSelectDate(day.dateString)}
      markedDates={markedDates}
      markingType="multi-dot"
      firstDay={1}
      theme={{
        backgroundColor: Colors.homeBg,
        calendarBackground: Colors.surface,
        textSectionTitleColor: Colors.textSecondary,
        selectedDayBackgroundColor: Colors.authGold,
        selectedDayTextColor: Colors.textOnPrimary,
        todayTextColor: Colors.authGold,
        dayTextColor: Colors.text,
        textDisabledColor: Colors.textLight,
        monthTextColor: Colors.text,
        arrowColor: Colors.authGold,
        textMonthFontWeight: '700',
        textDayFontSize: 14,
        textMonthFontSize: 16,
      }}
      style={styles.calendar}
    />
  );
}

const styles = StyleSheet.create({
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
});
