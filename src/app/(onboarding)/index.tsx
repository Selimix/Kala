import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Strings } from '../../constants/strings.fr';

export default function OnboardingChoiceScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../../../assets/kala-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>{Strings.app.name}</Text>
        <Text style={styles.welcome}>{Strings.onboarding.welcome}</Text>
        <Text style={styles.subtitle}>{Strings.onboarding.subtitle}</Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(onboarding)/create' as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIcon, { backgroundColor: Colors.authGold + '20' }]}>
            <Ionicons name="calendar-outline" size={32} color={Colors.authGold} />
          </View>
          <Text style={styles.cardTitle}>{Strings.onboarding.createCalendar}</Text>
          <Text style={styles.cardDesc}>
            Créez votre propre espace et invitez vos proches
          </Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} style={styles.cardArrow} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(onboarding)/join' as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIcon, { backgroundColor: Colors.authGold + '20' }]}>
            <Ionicons name="key-outline" size={32} color={Colors.authGold} />
          </View>
          <Text style={styles.cardTitle}>{Strings.onboarding.joinCalendar}</Text>
          <Text style={styles.cardDesc}>
            Entrez un code pour rejoindre un calendrier existant
          </Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} style={styles.cardArrow} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.authBackground,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.authTitle,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
    ...Platform.select({
      ios: { fontFamily: 'AvenirNextCondensed-Bold' },
      android: { fontFamily: 'sans-serif-condensed' },
      web: { fontFamily: 'Arial Narrow, sans-serif' },
    }),
  },
  welcome: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.authTitle,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.authTitle,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingRight: 24,
  },
  cardArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },
});
