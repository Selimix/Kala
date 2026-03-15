-- ============================================================
-- Migration 010: Add missing UPDATE policy on conversations
-- Problem: Edge Function tries to update conversation.updated_at
-- but no UPDATE policy exists, causing silent failure.
-- Also add missing UPDATE/DELETE policies on messages.
-- ============================================================

-- Allow users to update their own conversations
CREATE POLICY "Users can update their own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to update their own messages (for editing)
CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = user_id);
