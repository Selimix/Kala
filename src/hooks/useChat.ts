import { useState, useEffect, useCallback, useRef } from 'react';
import { sendMessage as sendAgentMessage } from '../services/agent';
import {
  createConversation,
  getActiveConversation,
  getMessages,
  listConversations,
} from '../services/conversations';
import { Strings } from '../constants/strings.fr';
import { useCalendar } from './useCalendar';
import type { Message, Conversation } from '../types/chat';

export function useChat() {
  const { activeCalendarId } = useCalendar();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadConversation();
  }, []);

  async function loadConversation() {
    try {
      const conversation = await getActiveConversation();
      if (conversation) {
        conversationIdRef.current = conversation.id;
        setActiveConversationId(conversation.id);
        const msgs = await getMessages(conversation.id);
        setMessages(msgs);
      }
    } catch (error) {
      console.error('Erreur chargement conversation:', error);
    }
  }

  const loadConversations = useCallback(async () => {
    try {
      const convos = await listConversations();
      setConversations(convos);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  }, []);

  const switchConversation = useCallback(async (conversationId: string) => {
    try {
      conversationIdRef.current = conversationId;
      setActiveConversationId(conversationId);
      const msgs = await getMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error('Erreur changement conversation:', error);
    }
  }, []);

  const startNewConversation = useCallback(async () => {
    try {
      const conversation = await createConversation();
      conversationIdRef.current = conversation.id;
      setActiveConversationId(conversation.id);
      setMessages([]);
    } catch (error) {
      console.error('Erreur création conversation:', error);
    }
  }, []);

  const sendMessage = useCallback(async (text: string, userLocation?: { latitude: number; longitude: number } | null) => {
    if (!text.trim()) return;

    // Creer une conversation si necessaire
    if (!conversationIdRef.current) {
      try {
        const conversation = await createConversation();
        conversationIdRef.current = conversation.id;
        setActiveConversationId(conversation.id);
      } catch (error) {
        console.error('Erreur création conversation:', error);
        return;
      }
    }

    // Ajouter le message utilisateur localement
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationIdRef.current!,
      user_id: '',
      role: 'user',
      content: text,
      tool_calls: null,
      tool_results: null,
      event_id: null,
      task_id: null,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [userMessage, ...prev]);
    setSending(true);

    try {
      const response = await sendAgentMessage(
        conversationIdRef.current!,
        text,
        activeCalendarId || undefined,
        userLocation
      );

      // Ajouter la reponse de l'assistant
      const assistantMessage: Message = {
        id: response.message_id,
        conversation_id: conversationIdRef.current!,
        user_id: '',
        role: 'assistant',
        content: response.assistant_message,
        tool_calls: response.tool_calls,
        tool_results: response.tool_results || null,
        event_id: response.events_affected?.[0] || null,
        task_id: response.tasks_affected?.[0] || null,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [assistantMessage, ...prev]);
    } catch (error: any) {
      console.error('Erreur envoi message:', error?.message || error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        conversation_id: conversationIdRef.current!,
        user_id: '',
        role: 'assistant',
        content: `${Strings.chat.error}\n\n(${error?.message || 'Erreur inconnue'})`,
        tool_calls: null,
        tool_results: null,
        event_id: null,
        task_id: null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [errorMessage, ...prev]);
    } finally {
      setSending(false);
    }
  }, [activeCalendarId]);

  return {
    messages,
    sending,
    sendMessage,
    conversations,
    activeConversationId,
    loadConversations,
    switchConversation,
    startNewConversation,
  };
}
