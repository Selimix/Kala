import { supabase } from './supabase';
import type { AgentResponse } from '../types/chat';

export async function sendMessage(
  conversationId: string,
  userMessage: string
): Promise<AgentResponse> {
  const { data, error } = await supabase.functions.invoke('chat-agent', {
    body: {
      conversation_id: conversationId,
      user_message: userMessage,
    },
  });

  if (error) throw error;
  return data as AgentResponse;
}
