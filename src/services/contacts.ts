import { Platform } from 'react-native';

// Import conditionnel — expo-contacts n'est pas disponible sur le web
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Contacts: any = null;
if (Platform.OS !== 'web') {
  Contacts = require('expo-contacts');
}

export interface NativeContact {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumbers: string[];
}

/**
 * Demande la permission d'accéder aux contacts.
 * @returns true si autorisé
 */
export async function requestContactsPermission(): Promise<boolean> {
  if (!Contacts) return false;

  const { status } = await Contacts.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Vérifie si la permission contacts est accordée.
 */
export async function hasContactsPermission(): Promise<boolean> {
  if (!Contacts) return false;

  const { status } = await Contacts.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Recherche dans les contacts natifs par prénom/nom.
 * @param query - texte à chercher (ex: "Agnès", "Martin")
 * @returns contacts correspondants avec numéros de téléphone
 */
export async function searchNativeContacts(query: string): Promise<NativeContact[]> {
  if (!Contacts) return [];

  const hasPermission = await hasContactsPermission();
  if (!hasPermission) {
    const granted = await requestContactsPermission();
    if (!granted) return [];
  }

  // Rechercher par nom
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.FirstName, Contacts.Fields.LastName],
    name: query,
    pageSize: 10,
  });

  if (!data || data.length === 0) return [];

  return data
    .filter((c: any) => c.name) // Exclure les contacts sans nom
    .map((contact: any) => ({
      id: contact.id,
      name: contact.name || '',
      firstName: contact.firstName || null,
      lastName: contact.lastName || null,
      phoneNumbers: (contact.phoneNumbers || [])
        .map((p: any) => p.number)
        .filter(Boolean),
    }))
    .filter((c: NativeContact) => c.phoneNumbers.length > 0); // Exclure ceux sans numéro
}

/**
 * Recherche un contact par nom exact ou partiel et retourne le premier match avec numéro.
 */
export async function findContactPhone(name: string): Promise<{ name: string; phone: string } | null> {
  const results = await searchNativeContacts(name);
  if (results.length === 0) return null;

  // Si un seul résultat, le retourner directement
  if (results.length === 1) {
    return {
      name: results[0].name,
      phone: results[0].phoneNumbers[0],
    };
  }

  // Sinon retourner null — l'UI proposera un choix via SuggestionChips
  return null;
}
