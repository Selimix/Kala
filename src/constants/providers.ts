import { Colors } from './colors';

export type AIProvider = 'claude' | 'openai' | 'gemini';

export const AI_PROVIDERS: Record<AIProvider, { label: string; description: string; color: string; icon: string }> = {
  claude: {
    label: 'Claude',
    description: 'Anthropic',
    color: '#D97706',
    icon: 'sparkles',
  },
  openai: {
    label: 'ChatGPT',
    description: 'OpenAI',
    color: '#10A37F',
    icon: 'chatbubble',
  },
  gemini: {
    label: 'Gemini',
    description: 'Google',
    color: '#4285F4',
    icon: 'diamond',
  },
};

export const DEFAULT_PROVIDER: AIProvider = 'claude';
