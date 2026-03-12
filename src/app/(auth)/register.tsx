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
        router.replace('/(tabs)/chat');
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
      <View style={styles.content}>
        <Text style={styles.title}>{Strings.app.name}</Text>
        <Text style={styles.subtitle}>{Strings.auth.register}</Text>

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
            <Text style={styles.linkText}>{Strings.auth.hasAccount}</Text>
            <Text style={styles.linkAction}> {Strings.auth.login}</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
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
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  linkText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  linkAction: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
