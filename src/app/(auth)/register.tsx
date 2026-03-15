import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { signUp } from '../../services/auth';
import { Colors } from '../../constants/colors';
import { Strings } from '../../constants/strings.fr';

const VALID_INVITATION_CODES = ['KALA2026', 'BETA-KALA'];

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!displayName || !email || !password || !confirmPassword || !invitationCode) return;

    if (!VALID_INVITATION_CODES.includes(invitationCode.trim().toUpperCase())) {
      Alert.alert('Erreur', Strings.auth.invalidInvitationCode);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', Strings.auth.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        Alert.alert('Erreur', Strings.auth.registerError);
      } else {
        router.replace('/(onboarding)' as any);
      }
    } catch {
      Alert.alert('Erreur', Strings.auth.registerError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require('../../../assets/kala-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>{Strings.app.name}</Text>
            <Text style={styles.subtitle}>{Strings.auth.register}</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={Strings.auth.invitationCode}
              placeholderTextColor={Colors.textLight}
              value={invitationCode}
              onChangeText={setInvitationCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder={Strings.auth.displayName}
              placeholderTextColor={Colors.textLight}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              textContentType="name"
            />
            <TextInput
              style={styles.input}
              placeholder={Strings.auth.email}
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <TextInput
              style={styles.input}
              placeholder={Strings.auth.password}
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
            />
            <TextInput
              style={styles.input}
              placeholder={Strings.auth.confirmPassword}
              placeholderTextColor={Colors.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? '...' : Strings.auth.register}
              </Text>
            </TouchableOpacity>
          </View>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.linkContainer}>
              <Text style={styles.linkText}>{Strings.auth.login}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.authBackground,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.authTitle,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
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
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.authGold,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  linkText: {
    color: Colors.authTitle,
    fontSize: 15,
    fontWeight: '500',
  },
});
