import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings.fr';
import { createCalendar } from '../services/calendars';
import { useCalendar } from '../hooks/useCalendar';
import { useAuth } from '../hooks/useAuth';

export default function CreateCalendarScreen() {
  const { refreshCalendars } = useCalendar();
  const { refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createCalendar({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      await refreshCalendars();
      await refreshProfile();
      router.back();
    } catch (err) {
      console.error('Erreur création calendrier:', err);
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
        <Text style={styles.headerTitle}>{Strings.calendars.create}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar-outline" size={48} color={Colors.authGold} />
        </View>

        <TextInput
          style={styles.input}
          placeholder={Strings.onboarding.calendarNamePlaceholder}
          placeholderTextColor={Colors.textLight}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <TextInput
          style={[styles.input, styles.inputDescription]}
          placeholder={Strings.onboarding.calendarDescription}
          placeholderTextColor={Colors.textLight}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{Strings.onboarding.create}</Text>
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
    marginBottom: 32,
  },
  input: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.authTitle,
    marginBottom: 12,
  },
  inputDescription: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    width: '100%',
    backgroundColor: Colors.authGold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
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
