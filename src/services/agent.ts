import { supabase } from './supabase';
import type { AgentResponse } from '../types/chat';

/**
 * Récupère un access_token frais, en forçant un refresh si nécessaire.
 */
async function getFreshAccessToken(): Promise<string> {
  // D'abord essayer la session en cache
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    const expiresAt = session.expires_at || 0;
    const now = Math.floor(Date.now() / 1000);
    // Si le token est valide pour plus de 60 secondes, l'utiliser
    if (expiresAt - now > 60) {
      return session.access_token;
    }
  }

  // Sinon, forcer un refresh
  const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
  if (error || !refreshed) {
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }
  return refreshed.access_token;
}

export async function sendMessage(
  conversationId: string,
  userMessage: string,
  calendarId?: string,
  userLocation?: { latitude: number; longitude: number } | null
): Promise<AgentResponse> {
  const accessToken = await getFreshAccessToken();

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Appel direct via fetch au lieu de supabase.functions.invoke
  // pour contrôler explicitement le header Authorization
  const response = await fetch(
    `${supabaseUrl}/functions/v1/chat-agent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': anonKey || '',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        user_message: userMessage,
        calendar_id: calendarId || null,
        user_location: userLocation || null,
      }),
    }
  );

  if (!response.ok) {
    let errorDetail: string;
    try {
      const body = await response.json();
      errorDetail = body?.error || body?.message || JSON.stringify(body);
    } catch {
      errorDetail = `HTTP ${response.status}`;
    }

    // Si JWT invalide, forcer un refresh et réessayer une fois
    if (response.status === 401) {
      console.warn('JWT invalide (401), refresh et retry...');
      const { data: { session: freshSession }, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && freshSession) {
        const retryResponse = await fetch(
          `${supabaseUrl}/functions/v1/chat-agent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${freshSession.access_token}`,
              'apikey': anonKey || '',
            },
            body: JSON.stringify({
              conversation_id: conversationId,
              user_message: userMessage,
              calendar_id: calendarId || null,
              user_location: userLocation || null,
            }),
          }
        );
        if (retryResponse.ok) {
          return await retryResponse.json() as AgentResponse;
        }
        // Si le retry échoue aussi, récupérer l'erreur
        try {
          const retryBody = await retryResponse.json();
          errorDetail = retryBody?.error || retryBody?.message || `HTTP ${retryResponse.status}`;
        } catch {
          errorDetail = `HTTP ${retryResponse.status} après retry`;
        }
      }
    }

    console.error('Agent error:', errorDetail);
    throw new Error(errorDetail);
  }

  return await response.json() as AgentResponse;
}
