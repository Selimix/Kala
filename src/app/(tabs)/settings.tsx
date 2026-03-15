import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signOut } from '../../services/auth';
import { useAuth } from '../../hooks/useAuth';
import { useCalendar } from '../../hooks/useCalendar';
import { Colors } from '../../constants/colors';
import { Strings } from '../../constants/strings.fr';
import { AI_PROVIDERS, type AIProvider } from '../../constants/providers';
import { isSyncEnabled, setSyncEnabled, clearSyncData } from '../../services/device-calendar';
import { leaveCalendar } from '../../services/calendars';

export default function SettingsScreen() {
  const { profile, updateProfile } = useAuth();
  const { calendars, activeCalendarId, setActiveCalendar, refreshCalendars } = useCalendar();
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(true);

  useEffect(() => {
    isSyncEnabled().then(setCalendarSyncEnabled);
  }, []);

  const handleLogout = async () => {
    await clearSyncData();
    await signOut();
    router.replace('/(auth)/login');
  };

  const toggleNotifications = async (value: boolean) => {
    await updateProfile({ notifications_enabled: value });
  };

  const toggleCalendarSync = async (value: boolean) => {
    await setSyncEnabled(value);
    setCalendarSyncEnabled(value);
  };

  const selectProvider = async (provider: AIProvider) => {
    await updateProfile({ ai_provider: provider });
  };

  const handleLeaveCalendar = (calendarId: string, calendarName: string) => {
    Alert.alert(
      Strings.calendars.leave,
      Strings.calendars.leaveConfirm,
      [
        { text: Strings.event.deleteConfirmNo, style: 'cancel' },
        {
          text: Strings.calendars.leave,
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCalendar(calendarId);
              await refreshCalendars();
              // Si c'était le calendrier actif, switcher au premier disponible
              if (calendarId === activeCalendarId && calendars.length > 1) {
                const next = calendars.find(c => c.id !== calendarId);
                if (next) await setActiveCalendar(next.id);
              }
            } catch (err) {
              console.error('Erreur quitter calendrier:', err);
            }
          },
        },
      ]
    );
  };

  const currentProvider = profile?.ai_provider || 'claude';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{Strings.settings.profile}</Text>
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.display_name?.charAt(0)?.toUpperCase() || 'K'}
              </Text>
            </View>
            <Text style={styles.displayName}>
              {profile?.display_name || 'Utilisateur'}
            </Text>
          </View>
        </View>

        {/* ── Section calendriers ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{Strings.calendars.title}</Text>
          <View style={styles.card}>
            {calendars.map((cal, index) => {
              const isActive = cal.id === activeCalendarId;
              const roleLabel = Strings.calendars.roles[cal.role] || '';
              return (
                <View key={cal.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <TouchableOpacity
                    style={styles.calendarRow}
                    onPress={() => {
                      if (cal.role === 'owner') {
                        router.push({ pathname: '/calendar-settings' as any, params: { calendarId: cal.id } });
                      }
                    }}
                  >
                    <Text style={styles.calendarEmoji}>{cal.emoji}</Text>
                    <View style={styles.calendarInfo}>
                      <Text style={[styles.calendarName, isActive && styles.calendarNameActive]}>
                        {cal.name}
                      </Text>
                      <Text style={styles.calendarRole}>{roleLabel}</Text>
                    </View>
                    {isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>{Strings.calendars.active}</Text>
                      </View>
                    )}
                    {cal.role !== 'owner' && (
                      <TouchableOpacity
                        onPress={() => handleLeaveCalendar(cal.id, cal.name)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="exit-outline" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                    {cal.role === 'owner' && (
                      <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
            {calendars.length === 0 && (
              <Text style={styles.emptyText}>{Strings.calendars.noCalendars}</Text>
            )}
          </View>

          {/* Boutons créer / rejoindre */}
          <View style={styles.calendarActions}>
            <TouchableOpacity
              style={styles.calendarActionBtn}
              onPress={() => router.push('/create-calendar' as any)}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.authGold} />
              <Text style={styles.calendarActionText}>{Strings.calendars.create}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.calendarActionBtn}
              onPress={() => router.push('/join-calendar' as any)}
            >
              <Ionicons name="enter-outline" size={18} color={Colors.authGold} />
              <Text style={styles.calendarActionText}>{Strings.calendars.join}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{Strings.settings.aiProvider}</Text>
          <View style={styles.card}>
            {(Object.entries(AI_PROVIDERS) as [AIProvider, typeof AI_PROVIDERS[AIProvider]][]).map(
              ([key, provider], index) => (
                <View key={key}>
                  {index > 0 && <View style={styles.divider} />}
                  <TouchableOpacity
                    style={styles.providerRow}
                    onPress={() => selectProvider(key)}
                  >
                    <View style={styles.providerInfo}>
                      <View style={[styles.providerDot, { backgroundColor: provider.color }]} />
                      <View>
                        <Text style={styles.providerName}>{provider.label}</Text>
                        <Text style={styles.providerDesc}>{provider.description}</Text>
                      </View>
                    </View>
                    {currentProvider === key && (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              )
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{Strings.settings.notifications}</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{Strings.settings.notifications}</Text>
              <Switch
                value={profile?.notifications_enabled ?? true}
                onValueChange={toggleNotifications}
                trackColor={{ false: Colors.borderLight, true: Colors.primaryLight }}
                thumbColor={profile?.notifications_enabled ? Colors.primary : Colors.textLight}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{Strings.settings.morningCheckin}</Text>
              <Text style={styles.settingValue}>
                {profile?.morning_checkin_time || '08:00'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{Strings.settings.eveningCheckin}</Text>
              <Text style={styles.settingValue}>
                {profile?.evening_checkin_time || '20:00'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{Strings.settings.calendarSync}</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.syncInfo}>
                <Text style={styles.settingLabel}>{Strings.settings.calendarSyncDesc}</Text>
              </View>
              <Switch
                value={calendarSyncEnabled}
                onValueChange={toggleCalendarSync}
                trackColor={{ false: Colors.borderLight, true: Colors.primaryLight }}
                thumbColor={calendarSyncEnabled ? Colors.primary : Colors.textLight}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{Strings.settings.logout}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>{Strings.settings.version} 1.0.0</Text>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },

  // ── Calendriers ──
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  calendarEmoji: {
    fontSize: 22,
  },
  calendarInfo: {
    flex: 1,
  },
  calendarName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  calendarNameActive: {
    color: Colors.authGold,
  },
  calendarRole: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  activeBadge: {
    backgroundColor: Colors.authGold + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.authGold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 8,
  },
  calendarActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  calendarActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.authGold + '40',
  },
  calendarActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.authGold,
  },

  // ── Providers ──
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  providerDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  syncInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  settingValue: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 12,
  },
  logoutButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error,
    marginTop: 8,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: Colors.textLight,
    fontSize: 12,
    marginTop: 24,
  },
  bottomSpacer: {
    height: 32,
  },
});
