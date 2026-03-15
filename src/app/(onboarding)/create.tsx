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
import { createCalendar } from '../../services/calendars';
import { createTaskCategory } from '../../services/tasks';
import { useCalendar } from '../../hooks/useCalendar';
import { useAuth } from '../../hooks/useAuth';

const DEFAULT_CATEGORIES = [
  { key: 'personnelle', name: 'Personnelle', icon: 'person', color: '#6C5CE7', isPrivate: true },
  { key: 'familiale', name: 'Familiale', icon: 'people', color: '#A29BFE', isPrivate: false },
  { key: 'professionnelle', name: 'Professionnelle', icon: 'briefcase', color: '#0984E3', isPrivate: false },
  { key: 'administrative', name: 'Administrative', icon: 'document-text', color: '#636E72', isPrivate: true },
  { key: 'sante', name: 'Santé', icon: 'medkit', color: '#00B894', isPrivate: true },
  { key: 'politique', name: 'Politique', icon: 'flag', color: '#E17055', isPrivate: true },
];

export default function CreateCalendarScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    DEFAULT_CATEGORIES.map(c => c.key)
  );
  const [loading, setLoading] = useState(false);
  const { refreshCalendars } = useCalendar();
  const { refreshProfile } = useAuth();

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const calendar = await createCalendar({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // Create selected task categories
      for (let i = 0; i < selectedCategories.length; i++) {
        const cat = DEFAULT_CATEGORIES.find(c => c.key === selectedCategories[i]);
        if (cat) {
          await createTaskCategory({
            calendar_id: calendar.id,
            name: cat.name,
            color: cat.color,
            icon: cat.icon,
            is_private_by_default: cat.isPrivate,
          });
        }
      }

      await refreshProfile();
      await refreshCalendars();
      router.replace('/(tabs)/chat');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de créer le calendrier');
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
            <Ionicons name="calendar-outline" size={36} color={Colors.authGold} />
          </View>
          <Text style={styles.title}>{Strings.onboarding.createCalendar}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{Strings.onboarding.calendarName}</Text>
          <TextInput
            style={styles.input}
            placeholder={Strings.onboarding.calendarNamePlaceholder}
            placeholderTextColor={Colors.textLight}
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={40}
          />

          <Text style={styles.label}>{Strings.onboarding.calendarDescription}</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Une description pour vos membres..."
            placeholderTextColor={Colors.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />

          <Text style={styles.label}>{Strings.taskCategories.defaultCategoriesTitle}</Text>
          <Text style={styles.hint}>{Strings.taskCategories.defaultCategoriesHint}</Text>
          <View style={styles.chipContainer}>
            {DEFAULT_CATEGORIES.map(cat => {
              const selected = selectedCategories.includes(cat.key);
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.chip,
                    selected && { backgroundColor: cat.color + '20', borderColor: cat.color },
                  ]}
                  onPress={() => toggleCategory(cat.key)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={16}
                    color={selected ? cat.color : Colors.textLight}
                  />
                  <Text style={[styles.chipText, selected && { color: cat.color }]}>
                    {cat.name}
                  </Text>
                  {cat.isPrivate && (
                    <Ionicons name="lock-closed" size={12} color={Colors.textLight} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '...' : Strings.onboarding.create}
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
    ...Platform.select({
      ios: { fontFamily: 'AvenirNextCondensed-Bold' },
      android: { fontFamily: 'sans-serif-condensed' },
      web: { fontFamily: 'Arial Narrow, sans-serif' },
    }),
  },
  form: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
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
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: Colors.authGold,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
