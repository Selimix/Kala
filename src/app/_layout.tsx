import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { AuthProvider } from '../hooks/useAuth';
import { CalendarProvider } from '../hooks/useCalendar';
import { supabase } from '../services/supabase';
import { Colors } from '../constants/colors';

SplashScreen.preventAutoHideAsync();

/**
 * Extraire les tokens Supabase d'un deep link et restaurer la session.
 * Supabase redirige avec : kala://reset-password#access_token=...&refresh_token=...
 */
function handleDeepLinkSession(url: string) {
  if (!url) return;
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return;

  const fragment = url.substring(hashIndex + 1);
  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();

    // Handle deep links (password reset, etc.)
    if (Platform.OS !== 'web') {
      // Check if app was opened via deep link
      Linking.getInitialURL().then((url) => {
        if (url) handleDeepLinkSession(url);
      });

      // Listen for deep links while app is open
      const subscription = Linking.addEventListener('url', ({ url }) => {
        handleDeepLinkSession(url);
      });

      return () => subscription.remove();
    }
  }, []);

  return (
    <AuthProvider>
      <CalendarProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        />
      </CalendarProvider>
    </AuthProvider>
  );
}
