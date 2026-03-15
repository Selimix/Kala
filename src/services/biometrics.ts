import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const BIOMETRIC_EMAIL_KEY = 'kala_bio_email';
const BIOMETRIC_PASSWORD_KEY = 'kala_bio_password';
const BIOMETRIC_ENABLED_KEY = 'kala_bio_enabled';

/**
 * Check if biometric hardware is available on this device
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

/**
 * Get the type of biometric authentication available (for display)
 */
export async function getBiometricType(): Promise<string> {
  if (Platform.OS === 'web') return '';
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Reconnaissance faciale';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Empreinte digitale';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
    return 'Biométrie';
  } catch {
    return 'Biométrie';
  }
}

/**
 * Save credentials securely for biometric login
 */
export async function saveBiometricCredentials(email: string, password: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
  await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password);
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
}

/**
 * Check if biometric login is enabled (credentials saved)
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch {
    return false;
  }
}

/**
 * Authenticate with biometrics and return saved credentials
 */
export async function authenticateWithBiometrics(): Promise<{ email: string; password: string } | null> {
  if (Platform.OS === 'web') return null;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Connectez-vous à Kāla',
      fallbackLabel: 'Utiliser le mot de passe',
      disableDeviceFallback: false,
    });

    if (!result.success) return null;

    const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    const password = await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);

    if (!email || !password) return null;
    return { email, password };
  } catch {
    return null;
  }
}

/**
 * Clear saved biometric credentials (on logout or disable)
 */
export async function clearBiometricCredentials(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  } catch {
    // ignore errors during cleanup
  }
}
