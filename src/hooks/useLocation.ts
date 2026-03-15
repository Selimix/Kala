import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

// Import conditionnel — expo-location n'est pas disponible sur le web
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Location: any = null;
if (Platform.OS !== 'web') {
  Location = require('expo-location');
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

/** Durée du cache en ms — 10 minutes */
const CACHE_DURATION_MS = 10 * 60 * 1000;

/**
 * Hook de géolocalisation on-demand.
 * - Foreground-only (jamais de tracking en arrière-plan)
 * - Cache 10 minutes en mémoire (pas de stockage persistant)
 * - Dégradation silencieuse si permission refusée ou web
 */
export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const lastFetchedAt = useRef<number>(0);
  const cachedLocation = useRef<UserLocation | null>(null);

  const fetchLocation = useCallback(async (): Promise<UserLocation | null> => {
    // Pas de géoloc sur web
    if (Platform.OS === 'web' || !Location) return null;

    // Retourner le cache si encore frais
    const now = Date.now();
    if (cachedLocation.current && (now - lastFetchedAt.current) < CACHE_DURATION_MS) {
      return cachedLocation.current;
    }

    try {
      // Demander la permission foreground uniquement
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        console.log('[Location] Permission refusée');
        return null;
      }

      // Récupérer la position (~100m de précision, rapide et économe en batterie)
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: UserLocation = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };

      // Mettre en cache
      cachedLocation.current = coords;
      lastFetchedAt.current = now;
      setLocation(coords);

      console.log(`[Location] Position: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      return coords;
    } catch (error) {
      console.warn('[Location] Erreur géolocalisation:', error);
      return null;
    }
  }, []);

  // Récupérer la position au montage du composant
  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return {
    /** Position actuelle (cache) ou null */
    location,
    /** Statut de la permission : 'granted' | 'denied' | 'undetermined' | null */
    permissionStatus,
    /** Forcer un rafraîchissement de la position */
    refreshLocation: fetchLocation,
  };
}
