import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { searchNativeContacts, type NativeContact } from '../../services/contacts';

interface Props {
  personaName: string;
  onContactFound: (name: string, phone: string) => void;
}

export function ContactLookupCard({ personaName, onContactFound }: Props) {
  const [state, setState] = useState<'idle' | 'searching' | 'results' | 'notfound'>('idle');
  const [contacts, setContacts] = useState<NativeContact[]>([]);

  const handleSearch = useCallback(async () => {
    setState('searching');
    try {
      const results = await searchNativeContacts(personaName);
      if (results.length === 0) {
        setState('notfound');
      } else if (results.length === 1) {
        // Un seul résultat — envoyer directement
        onContactFound(results[0].name, results[0].phoneNumbers[0]);
        setState('results');
        setContacts(results);
      } else {
        // Plusieurs résultats — laisser choisir
        setContacts(results);
        setState('results');
      }
    } catch (err) {
      console.error('[ContactLookup] Erreur:', err);
      setState('notfound');
    }
  }, [personaName, onContactFound]);

  if (state === 'idle') {
    return (
      <TouchableOpacity style={styles.card} onPress={handleSearch} activeOpacity={0.7}>
        <View style={styles.iconRow}>
          <Ionicons name="person-circle-outline" size={20} color={Colors.authGold} />
          <Text style={styles.title}>Chercher dans mes contacts</Text>
        </View>
        <Text style={styles.subtitle}>Trouver le numéro de {personaName}</Text>
      </TouchableOpacity>
    );
  }

  if (state === 'searching') {
    return (
      <View style={styles.card}>
        <View style={styles.iconRow}>
          <ActivityIndicator size="small" color={Colors.authGold} />
          <Text style={styles.title}>Recherche en cours...</Text>
        </View>
      </View>
    );
  }

  if (state === 'notfound') {
    return (
      <View style={[styles.card, styles.cardMuted]}>
        <View style={styles.iconRow}>
          <Ionicons name="alert-circle-outline" size={20} color={Colors.homeTextMuted} />
          <Text style={styles.titleMuted}>Aucun contact trouvé pour "{personaName}"</Text>
        </View>
      </View>
    );
  }

  // results
  return (
    <View style={styles.card}>
      <Text style={styles.resultLabel}>Contacts trouvés :</Text>
      {contacts.map((contact) => (
        <TouchableOpacity
          key={contact.id}
          style={styles.contactRow}
          onPress={() => onContactFound(contact.name, contact.phoneNumbers[0])}
          activeOpacity={0.7}
        >
          <Ionicons name="person" size={16} color={Colors.authGold} />
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactPhone}>{contact.phoneNumbers[0]}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.homeTextMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    backgroundColor: 'rgba(184, 149, 106, 0.08)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(184, 149, 106, 0.25)',
  },
  cardMuted: {
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.authGold,
  },
  titleMuted: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.homeTextMuted,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.homeTextMuted,
    marginTop: 4,
    marginLeft: 28,
  },
  resultLabel: {
    fontSize: 12,
    color: Colors.homeTextMuted,
    marginBottom: 8,
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    gap: 10,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  contactPhone: {
    fontSize: 12,
    color: Colors.homeTextMuted,
    marginTop: 1,
  },
});
