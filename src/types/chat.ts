export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  tool_calls: ToolCall[] | null;
  tool_results: ToolResult[] | null;
  event_id: string | null;
  task_id: string | null;
  created_at: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentResponse {
  assistant_message: string;
  tool_calls: ToolCall[] | null;
  tool_results: ToolResult[] | null;
  events_affected: string[];
  tasks_affected: string[];
  conversation_id: string;
  message_id: string;
}
