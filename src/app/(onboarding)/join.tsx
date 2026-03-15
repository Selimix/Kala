import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Strings } from '../../constants/strings.fr';
import { joinCalendarByCode } from '../../services/calendars';
import { useCalendar } from '../../hooks/useCalendar';
import { useAuth } from '../../hooks/useAuth';

export default function JoinCalendarScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { refreshCalendars } = useCalendar();
  const { refreshProfile } = useAuth();

  // Format code input: auto-uppercase, add dash after KAL
  const handleCodeChange = (text: string) => {
    const upper = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setCode(upper);
    setError('');
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await joinCalendarByCode(code.trim());
      if (result.error) {
        setError(result.error);
      } else {
        await refreshProfile();
        await refreshCalendars();
        Alert.alert(
          Strings.onboarding.joined,
          `Vous avez rejoint "${result.calendar_name}"`,
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/chat') }]
        );
      }
    } catch (err: any) {
      setError(err.message || Strings.onboarding.invalidCode);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.authTitle} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={36} color={Colors.authGold} />
          </View>
          <Text style={styles.title}>{Strings.onboarding.joinCalendar}</Text>
          <Text style={styles.subtitle}>
            Entrez le code reçu pour rejoindre un calendrier
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.codeInput}
            placeholder={Strings.onboarding.inviteCodePlaceholder}
            placeholderTextColor={Colors.textLight}
            value={code}
            onChangeText={handleCodeChange}
            autoFocus
            autoCapitalize="characters"
            maxLength={8}
            textAlign="center"
          />

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, (!code.trim() || loading) && styles.buttonDisabled]}
            onPress={handleJoin}
            disabled={!code.trim() || loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '...' : Strings.onboarding.join}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.authBackground,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  back: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.authGold + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.authTitle,
    textAlign: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: { fontFamily: 'AvenirNextCondensed-Bold' },
      android: { fontFamily: 'sans-serif-condensed' },
      web: { fontFamily: 'Arial Narrow, sans-serif' },
    }),
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: 12,
  },
  codeInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.authTitle,
    borderWidth: 1,
    borderColor: Colors.border,
    letterSpacing: 3,
  },
  errorText: {
    color: '#C53030',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.authGold,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
