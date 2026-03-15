import { useState, useCallback } from 'react';
import {
  searchNativeContacts,
  requestContactsPermission,
  type NativeContact,
} from '../services/contacts';

/**
 * Hook pour la recherche de contacts natifs.
 * Gère la permission et le cache des résultats.
 */
export function useContacts() {
  const [lastResults, setLastResults] = useState<NativeContact[]>([]);

  const searchContacts = useCallback(async (query: string): Promise<NativeContact[]> => {
    if (!query || query.trim().length < 2) return [];

    const results = await searchNativeContacts(query.trim());
    setLastResults(results);
    return results;
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    return requestContactsPermission();
  }, []);

  return {
    searchContacts,
    requestPermission,
    lastResults,
  };
}
