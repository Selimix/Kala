import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings.fr';
import { useCalendar } from '../hooks/useCalendar';
import {
  getCalendarMembers,
  getInviteCodes,
  createInviteCode,
  deleteInviteCode,
  updateMemberRole,
  removeMember,
  deleteCalendar,
} from '../services/calendars';
import type { CalendarMember, InviteCode, CalendarRole } from '../types/calendars';

export default function CalendarSettingsScreen() {
  const { calendarId } = useLocalSearchParams<{ calendarId: string }>();
  const { calendars, refreshCalendars } = useCalendar();
  const calendar = calendars.find(c => c.id === calendarId);

  const [members, setMembers] = useState<CalendarMember[]>([]);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);

  const loadData = useCallback(async () => {
    if (!calendarId) return;
    try {
      const [m, c] = await Promise.all([
        getCalendarMembers(calendarId),
        getInviteCodes(calendarId),
      ]);
      setMembers(m);
      setCodes(c);
    } catch (err) {
      console.error('Erreur chargement paramètres calendrier:', err);
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateCode = async () => {
    if (!calendarId) return;
    setGeneratingCode(true);
    try {
      await createInviteCode({ calendar_id: calendarId, role: 'editor' });
      await loadData();
    } catch (err) {
      console.error('Erreur génération code:', err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert(Strings.calendars.codeCopied);
  };

  const handleDeleteCode = async (codeId: string) => {
    try {
      await deleteInviteCode(codeId);
      await loadData();
    } catch (err) {
      console.error('Erreur suppression code:', err);
    }
  };

  const handleChangeRole = (member: CalendarMember) => {
    if (!calendarId) return;
    Alert.alert('Changer le rôle', undefined, [
      {
        text: Strings.calendars.roles.editor,
        onPress: async () => {
          try {
            await updateMemberRole(calendarId, member.user_id, 'editor');
            await loadData();
          } catch (err) {
            console.error('Erreur changement rôle:', err);
          }
        },
      },
      {
        text: Strings.calendars.roles.viewer,
        onPress: async () => {
          try {
            await updateMemberRole(calendarId, member.user_id, 'viewer');
            await loadData();
          } catch (err) {
            console.error('Erreur changement rôle:', err);
          }
        },
      },
      { text: Strings.event.deleteConfirmNo, style: 'cancel' },
    ]);
  };

  const handleRemoveMember = (member: CalendarMember) => {
    if (!calendarId) return;
    const name = member.profile?.display_name || 'Membre';
    Alert.alert(
      'Retirer le membre',
      `Retirer ${name} de ce calendrier ?`,
      [
        { text: Strings.event.deleteConfirmNo, style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(calendarId, member.user_id);
              await loadData();
            } catch (err) {
              console.error('Erreur retrait membre:', err);
            }
          },
        },
      ]
    );
  };

  const handleDeleteCalendar = () => {
    if (!calendarId) return;
    Alert.alert(
      Strings.calendars.delete,
      Strings.calendars.deleteConfirm,
      [
        { text: Strings.event.deleteConfirmNo, style: 'cancel' },
        {
          text: Strings.calendars.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCalendar(calendarId);
              await refreshCalendars();
              router.back();
            } catch (err) {
              console.error('Erreur suppression calendrier:', err);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.authGold} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.authTitle} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {calendar?.emoji} {calendar?.name || Strings.calendars.settings}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Membres ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{Strings.calendars.members}</Text>
          <View style={styles.card}>
            {members.map((member, index) => (
              <View key={member.id}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {member.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.profile?.display_name || 'Membre'}
                    </Text>
                    <Text style={styles.memberRole}>
                      {Strings.calendars.roles[member.role]}
                    </Text>
                  </View>
                  {member.role !== 'owner' && (
                    <View style={styles.memberActions}>
                      <TouchableOpacity
                        onPress={() => handleChangeRole(member)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="swap-horizontal" size={18} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(member)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Codes d'invitation ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{Strings.calendars.inviteCodes}</Text>
          <View style={styles.card}>
            {codes.map((code, index) => (
              <View key={code.id}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.codeRow}>
                  <View style={styles.codeInfo}>
                    <Text style={styles.codeText}>{code.code}</Text>
                    <Text style={styles.codeRole}>
                      {Strings.calendars.roles[code.role]}
                      {code.max_uses ? ` · ${code.use_count}/${code.max_uses}` : ''}
                      {code.expires_at
                        ? ` · ${Strings.calendars.codeExpires} ${new Date(code.expires_at).toLocaleDateString('fr-FR')}`
                        : ` · ${Strings.calendars.noExpiry}`}
                    </Text>
                  </View>
                  <View style={styles.codeActions}>
                    <TouchableOpacity
                      onPress={() => handleCopyCode(code.code)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="copy-outline" size={18} color={Colors.authGold} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCode(code.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
            {codes.length === 0 && (
              <Text style={styles.emptyText}>Aucun code d'invitation</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.generateBtn}
            onPress={handleGenerateCode}
            disabled={generatingCode}
          >
            {generatingCode ? (
              <ActivityIndicator size="small" color={Colors.authGold} />
            ) : (
              <>
                <Ionicons name="key-outline" size={18} color={Colors.authGold} />
                <Text style={styles.generateBtnText}>{Strings.calendars.generateCode}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Zone danger ── */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteCalendar}>
          <Ionicons name="trash" size={18} color={Colors.error} />
          <Text style={styles.deleteText}>{Strings.calendars.delete}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.authBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.authTitle,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 10,
  },

  // ── Membres ──
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.authGold + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.authGold,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  memberRole: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 12,
  },

  // ── Codes ──
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeInfo: {
    flex: 1,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.authGold,
    letterSpacing: 1,
  },
  codeRole: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 8,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.authGold + '40',
  },
  generateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.authGold,
  },

  // ── Danger zone ──
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  deleteText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
});
