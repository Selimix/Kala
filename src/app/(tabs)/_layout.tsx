import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Strings } from '../../constants/strings.fr';
import { useNotifications } from '../../hooks/useNotifications';
import { useCalendarSync } from '../../hooks/useCalendarSync';
import { useCalendar } from '../../hooks/useCalendar';
import { CalendarSelector } from '../../components/ui/CalendarSelector';

export default function TabsLayout() {
  useNotifications();
  useCalendarSync();

  const { calendars, activeCalendarId, setActiveCalendar } = useCalendar();

  const calendarSelectorHeader = () => (
    <CalendarSelector
      calendars={calendars}
      activeCalendarId={activeCalendarId}
      onSelect={setActiveCalendar}
    />
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.authGold,
        tabBarInactiveTintColor: Colors.homeTextMuted,
        tabBarStyle: {
          backgroundColor: Colors.authBackground,
          borderTopColor: Colors.homeInputBorder,
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        headerStyle: {
          backgroundColor: Colors.authBackground,
        },
        headerTitleStyle: {
          color: Colors.authTitle,
          fontWeight: '700',
          fontSize: 18,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: Strings.tabs.chat,
          headerShown: true,
          headerTitle: calendarSelectorHeader,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Rendez-vous',
          headerTitle: calendarSelectorHeader,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tâches',
          headerTitle: calendarSelectorHeader,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: Strings.tabs.calendar,
          headerTitle: calendarSelectorHeader,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: Strings.tabs.settings,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
