-- ============================================================
-- Migration 005: Systeme de taches
-- Ajoute: task_status, task_priority enums + table tasks
-- RLS via calendar_members (meme pattern que events)
-- ============================================================

-- ── 1. Enums ──
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- ── 2. Table tasks ──
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Indexes ──
CREATE INDEX idx_tasks_calendar_status ON public.tasks(calendar_id, status);
CREATE INDEX idx_tasks_calendar_due ON public.tasks(calendar_id, due_date);
CREATE INDEX idx_tasks_user_status ON public.tasks(user_id, status);

-- ── 4. RLS (meme pattern que events dans migration 004) ──
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Calendar members can view tasks"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = tasks.calendar_id
        AND calendar_members.user_id = auth.uid()
    )
    OR (tasks.calendar_id IS NULL AND auth.uid() = tasks.user_id)
  );

CREATE POLICY "Owner/editor can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = tasks.calendar_id
        AND calendar_members.user_id = auth.uid()
        AND calendar_members.role IN ('owner', 'editor')
    )
    OR (tasks.calendar_id IS NULL AND auth.uid() = tasks.user_id)
  );

CREATE POLICY "Owner/editor can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = tasks.calendar_id
        AND calendar_members.user_id = auth.uid()
        AND calendar_members.role IN ('owner', 'editor')
    )
    OR (tasks.calendar_id IS NULL AND auth.uid() = tasks.user_id)
  );

CREATE POLICY "Owner/editor can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = tasks.calendar_id
        AND calendar_members.user_id = auth.uid()
        AND calendar_members.role IN ('owner', 'editor')
    )
    OR (tasks.calendar_id IS NULL AND auth.uid() = tasks.user_id)
  );

-- ── 5. Trigger updated_at ──
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 6. Realtime ──
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
