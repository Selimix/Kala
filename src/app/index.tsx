import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/colors';

export default function Index() {
  const { session, profile, loading, isPasswordRecovery } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Si l'utilisateur vient d'un lien de récupération de mot de passe
  if (isPasswordRecovery && session) {
    return <Redirect href={'/reset-password' as any} />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Si l'onboarding n'est pas terminé, rediriger vers l'onboarding
  if (!profile?.has_completed_onboarding) {
    return <Redirect href={'/(onboarding)' as any} />;
  }

  return <Redirect href="/(tabs)/chat" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
