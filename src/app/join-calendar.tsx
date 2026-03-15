import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings.fr';
import { joinCalendarByCode } from '../services/calendars';
import { useCalendar } from '../hooks/useCalendar';

export default function JoinCalendarScreen() {
  const { refreshCalendars, setActiveCalendar } = useCalendar();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCodeChange = (text: string) => {
    // Auto-format: majuscules, max 8 chars (KAL-XXXX)
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setCode(cleaned);
    setError('');
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');

    try {
      const result = await joinCalendarByCode(code.trim());

      if (result.error) {
        if (result.error === 'already_member') {
          setError(Strings.onboarding.alreadyMember);
        } else {
          setError(Strings.onboarding.invalidCode);
        }
        return;
      }

      if (result.success && result.calendar_id) {
        await refreshCalendars();
        await setActiveCalendar(result.calendar_id);
        Alert.alert(
          Strings.onboarding.joined,
          result.calendar_name || '',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (err) {
      setError(Strings.onboarding.invalidCode);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.authTitle} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{Strings.calendars.join}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="enter-outline" size={48} color={Colors.authGold} />
        </View>

        <Text style={styles.description}>
          Entrez le code d'invitation pour rejoindre un calendrier partagé.
        </Text>

        <TextInput
          style={styles.input}
          placeholder={Strings.onboarding.inviteCodePlaceholder}
          placeholderTextColor={Colors.textLight}
          value={code}
          onChangeText={handleCodeChange}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (!code.trim() || loading) && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={!code.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{Strings.onboarding.join}</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.authGold + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  input: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.authTitle,
    textAlign: 'center',
    letterSpacing: 2,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: Colors.authGold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
