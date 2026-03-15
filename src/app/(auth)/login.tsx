import { useState, useEffect } from 'react';
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
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signIn, resetPassword } from '../../services/auth';
import {
  isBiometricAvailable,
  getBiometricType,
  isBiometricLoginEnabled,
  authenticateWithBiometrics,
  saveBiometricCredentials,
} from '../../services/biometrics';
import { Colors } from '../../constants/colors';
import { Strings } from '../../constants/strings.fr';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('');

  // Check biometric availability on mount
  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      const enabled = await isBiometricLoginEnabled();
      if (available && enabled) {
        setBiometricReady(true);
        const label = await getBiometricType();
        setBiometricLabel(label);
        // Auto-trigger biometric on first load
        handleBiometricLogin();
      }
    })();
  }, []);

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    const e = loginEmail || email;
    const p = loginPassword || password;
    if (!e || !p) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(e, p);
      if (error) {
        Alert.alert('Erreur', Strings.auth.loginError);
      } else {
        // Save credentials for biometric login next time
        const bioAvailable = await isBiometricAvailable();
        if (bioAvailable) {
          await saveBiometricCredentials(e, p);
        }
        router.replace('/');
      }
    } catch {
      Alert.alert('Erreur', Strings.auth.loginError);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const credentials = await authenticateWithBiometrics();
      if (credentials) {
        await handleLogin(credentials.email, credentials.password);
      }
    } catch {
      // User cancelled or biometric failed — do nothing
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailToReset = email.trim();
    if (!emailToReset) {
      Alert.alert(Strings.auth.resetPasswordTitle, 'Entrez votre email ci-dessus, puis appuyez sur "Mot de passe oublié".');
      return;
    }
    try {
      const { error } = await resetPassword(emailToReset);
      if (error) {
        Alert.alert('Erreur', Strings.auth.resetPasswordError);
      } else {
        Alert.alert(Strings.auth.resetPasswordSent, Strings.auth.resetPasswordSentMessage);
      }
    } catch {
      Alert.alert('Erreur', Strings.auth.resetPasswordError);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            source={require('../../../assets/kala-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{Strings.app.name}</Text>
          <Text style={styles.subtitle}>{Strings.app.tagline}</Text>
        </View>

        <View style={styles.form}>
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
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder={Strings.auth.password}
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textContentType="password"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(prev => !prev)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => handleLogin()}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '...' : Strings.auth.login}
            </Text>
          </TouchableOpacity>

          {/* Biometric login button */}
          {biometricReady && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              disabled={loading}
            >
              <Ionicons
                name={biometricLabel.includes('Face') ? 'scan-outline' : 'finger-print-outline'}
                size={24}
                color={Colors.authGold}
              />
              <Text style={styles.biometricText}>
                Se connecter avec {biometricLabel}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotContainer}>
            <Text style={styles.forgotText}>{Strings.auth.forgotPassword}</Text>
          </TouchableOpacity>
        </View>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.linkContainer}>
            <Text style={styles.linkText}>{Strings.auth.register}</Text>
          </TouchableOpacity>
        </Link>
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
    paddingHorizontal: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
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
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.authGold,
    backgroundColor: Colors.authGold + '10',
  },
  biometricText: {
    color: Colors.authGold,
    fontSize: 15,
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
  forgotContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  forgotText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
