import { supabase } from './supabase';
import type { Conversation, Message } from '../types/chat';

export async function createConversation(): Promise<Conversation> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveConversation(): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function listConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function getConversationPreview(conversationId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('messages')
    .select('content, role')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data?.content?.slice(0, 80) || null;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
