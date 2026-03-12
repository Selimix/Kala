-- ============================================================
-- Add AI provider choice to profiles
-- ============================================================
create type ai_provider as enum ('claude', 'openai', 'gemini');

alter table public.profiles
  add column ai_provider ai_provider not null default 'claude';
