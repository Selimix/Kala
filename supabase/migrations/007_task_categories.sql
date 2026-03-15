-- ============================================================
-- Migration 007: Task Categories + Privacy
-- ============================================================

-- 1. Table task_categories
CREATE TABLE public.task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#636E72',
  icon TEXT NOT NULL DEFAULT 'pricetag',
  is_private_by_default BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_categories_calendar ON public.task_categories(calendar_id);

-- 2. RLS (reuse SECURITY DEFINER helpers from migration 006)
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Calendar members can view task categories"
  ON public.task_categories FOR SELECT
  USING (is_member_of_calendar(calendar_id));

CREATE POLICY "Owner/editor can create task categories"
  ON public.task_categories FOR INSERT
  WITH CHECK (is_owner_or_editor(calendar_id));

CREATE POLICY "Owner/editor can update task categories"
  ON public.task_categories FOR UPDATE
  USING (is_owner_or_editor(calendar_id));

CREATE POLICY "Owner can delete task categories"
  ON public.task_categories FOR DELETE
  USING (is_owner_of_calendar(calendar_id));

-- 3. Alter tasks table: add category_id + is_private
ALTER TABLE public.tasks
  ADD COLUMN category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL,
  ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_tasks_category ON public.tasks(category_id);

-- 4. Function to create default categories for a calendar
CREATE OR REPLACE FUNCTION public.create_default_categories(p_calendar_id UUID)
RETURNS SETOF public.task_categories AS $$
  INSERT INTO public.task_categories (calendar_id, name, color, icon, is_private_by_default, position)
  VALUES
    (p_calendar_id, 'Personnelle',       '#6C5CE7', 'person',        true,  0),
    (p_calendar_id, 'Familiale',         '#A29BFE', 'people',        false, 1),
    (p_calendar_id, 'Professionnelle',   '#0984E3', 'briefcase',     false, 2),
    (p_calendar_id, 'Administrative',    '#636E72', 'document-text', true,  3),
    (p_calendar_id, 'Santé',            '#00B894', 'medkit',         true,  4),
    (p_calendar_id, 'Politique',         '#E17055', 'flag',           true,  5)
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. Enable realtime for task_categories
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_categories;
