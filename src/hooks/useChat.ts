import { useState, useEffect, useCallback, useRef } from 'react';
import { sendMessage as sendAgentMessage } from '../services/agent';
import {
  createConversation,
  getActiveConversation,
  getMessages,
} from '../services/conversations';
import { Strings } from '../constants/strings.fr';
import type { Message } from '../types/chat';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadConversation();
  }, []);

  async function loadConversation() {
    try {
      const conversation = await getActiveConversation();
      if (conversation) {
        conversationIdRef.current = conversation.id;
        const msgs = await getMessages(conversation.id);
        setMessages(msgs);
      }
    } catch (error) {
      console.error('Erreur chargement conversation:', error);
    }
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Creer une conversation si necessaire
    if (!conversationIdRef.current) {
      try {
        const conversation = await createConversation();
        conversationIdRef.current = conversation.id;
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
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [userMessage, ...prev]);
    setSending(true);

    try {
      const response = await sendAgentMessage(
        conversationIdRef.current!,
        text
      );

      // Ajouter la reponse de l'assistant
      const assistantMessage: Message = {
        id: response.message_id,
        conversation_id: conversationIdRef.current!,
        user_id: '',
        role: 'assistant',
        content: response.assistant_message,
        tool_calls: response.tool_calls,
        tool_results: null,
        event_id: response.events_affected?.[0] || null,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [assistantMessage, ...prev]);
    } catch (error) {
      console.error('Erreur envoi message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        conversation_id: conversationIdRef.current!,
        user_id: '',
        role: 'assistant',
        content: Strings.chat.error,
        tool_calls: null,
        tool_results: null,
        event_id: null,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [errorMessage, ...prev]);
    } finally {
      setSending(false);
    }
  }, []);

  return { messages, sending, sendMessage };
}
