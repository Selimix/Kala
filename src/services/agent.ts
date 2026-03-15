import { supabase } from './supabase';
import type { AgentResponse } from '../types/chat';

export async function sendMessage(
  conversationId: string,
  userMessage: string,
  calendarId?: string,
  userLocation?: { latitude: number; longitude: number } | null
): Promise<AgentResponse> {
  const { data, error } = await supabase.functions.invoke('chat-agent', {
    body: {
      conversation_id: conversationId,
      user_message: userMessage,
      calendar_id: calendarId || null,
      user_location: userLocation || null,
    },
  });

  if (error) throw error;
  return data as AgentResponse;
}
