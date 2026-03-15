-- ============================================================
-- Migration 006: Fix infinite recursion in calendar_members RLS
-- The calendar_members SELECT policy was querying calendar_members
-- itself, causing infinite recursion. Fix: use SECURITY DEFINER
-- functions that bypass RLS for membership checks.
-- ============================================================

-- ── 1. Helper functions (bypass RLS) ──

CREATE OR REPLACE FUNCTION public.is_member_of_calendar(p_calendar_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_members
    WHERE calendar_id = p_calendar_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_owner_or_editor(p_calendar_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_members
    WHERE calendar_id = p_calendar_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_owner_of_calendar(p_calendar_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_members
    WHERE calendar_id = p_calendar_id
      AND user_id = auth.uid()
      AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 2. Fix calendar_members policies ──

DROP POLICY IF EXISTS "Members can view calendar members" ON public.calendar_members;
CREATE POLICY "Members can view calendar members"
  ON public.calendar_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_member_of_calendar(calendar_id)
  );

DROP POLICY IF EXISTS "Authorized users can add members" ON public.calendar_members;
CREATE POLICY "Authorized users can add members"
  ON public.calendar_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR is_owner_or_editor(calendar_id)
  );

DROP POLICY IF EXISTS "Owner can update member roles" ON public.calendar_members;
CREATE POLICY "Owner can update member roles"
  ON public.calendar_members FOR UPDATE
  USING (is_owner_of_calendar(calendar_id));

DROP POLICY IF EXISTS "Members can leave or owner can remove" ON public.calendar_members;
CREATE POLICY "Members can leave or owner can remove"
  ON public.calendar_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR is_owner_of_calendar(calendar_id)
  );

-- ── 3. Fix calendars policies (use helper functions) ──

DROP POLICY IF EXISTS "Members can view their calendars" ON public.calendars;
CREATE POLICY "Members can view their calendars"
  ON public.calendars FOR SELECT
  USING (is_member_of_calendar(id));

DROP POLICY IF EXISTS "Owner can update calendar" ON public.calendars;
CREATE POLICY "Owner can update calendar"
  ON public.calendars FOR UPDATE
  USING (is_owner_of_calendar(id));

DROP POLICY IF EXISTS "Owner can delete calendar" ON public.calendars;
CREATE POLICY "Owner can delete calendar"
  ON public.calendars FOR DELETE
  USING (is_owner_of_calendar(id));

-- ── 4. Fix invite_codes policies ──

DROP POLICY IF EXISTS "Members can view invite codes" ON public.invite_codes;
CREATE POLICY "Members can view invite codes"
  ON public.invite_codes FOR SELECT
  USING (is_member_of_calendar(calendar_id));

DROP POLICY IF EXISTS "Owner/editor can create invite codes" ON public.invite_codes;
CREATE POLICY "Owner/editor can create invite codes"
  ON public.invite_codes FOR INSERT
  WITH CHECK (is_owner_or_editor(calendar_id));

DROP POLICY IF EXISTS "Owner can delete invite codes" ON public.invite_codes;
CREATE POLICY "Owner can delete invite codes"
  ON public.invite_codes FOR DELETE
  USING (is_owner_of_calendar(calendar_id));

DROP POLICY IF EXISTS "Owner/editor can update invite codes" ON public.invite_codes;
CREATE POLICY "Owner/editor can update invite codes"
  ON public.invite_codes FOR UPDATE
  USING (is_owner_or_editor(calendar_id));

-- ── 5. Fix events policies ──

DROP POLICY IF EXISTS "Calendar members can view events" ON public.events;
CREATE POLICY "Calendar members can view events"
  ON public.events FOR SELECT
  USING (
    is_member_of_calendar(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Owner/editor can create events" ON public.events;
CREATE POLICY "Owner/editor can create events"
  ON public.events FOR INSERT
  WITH CHECK (
    is_owner_or_editor(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Owner/editor can update events" ON public.events;
CREATE POLICY "Owner/editor can update events"
  ON public.events FOR UPDATE
  USING (
    is_owner_or_editor(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Owner/editor can delete events" ON public.events;
CREATE POLICY "Owner/editor can delete events"
  ON public.events FOR DELETE
  USING (
    is_owner_or_editor(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

-- ── 6. Fix places policies ──

DROP POLICY IF EXISTS "Calendar members can view places" ON public.places;
CREATE POLICY "Calendar members can view places"
  ON public.places FOR SELECT
  USING (
    is_member_of_calendar(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Owner/editor can create places" ON public.places;
CREATE POLICY "Owner/editor can create places"
  ON public.places FOR INSERT
  WITH CHECK (
    is_owner_or_editor(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Owner/editor can update places" ON public.places;
CREATE POLICY "Owner/editor can update places"
  ON public.places FOR UPDATE
  USING (
    is_owner_or_editor(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Owner/editor can delete places" ON public.places;
CREATE POLICY "Owner/editor can delete places"
  ON public.places FOR DELETE
  USING (
    is_owner_or_editor(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

-- ── 7. Fix personas policies ──

DROP POLICY IF EXISTS "Calendar members can view personas" ON public.personas;
CREATE POLICY "Calendar members can view personas"
  ON public.personas FOR SELECT
  USING (
    is_member_of_calendar(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Owner/editor can create personas" ON public.personas;
CREATE POLICY "Owner/editor can create personas"
  ON public.personas FOR INSERT
  WITH CHECK (
    is_owner_or_editor(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Owner/editor can update personas" ON public.personas;
CREATE POLICY "Owner/editor can update personas"
  ON public.personas FOR UPDATE
  USING (
    is_owner_or_editor(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Owner/editor can delete personas" ON public.personas;
CREATE POLICY "Owner/editor can delete personas"
  ON public.personas FOR DELETE
  USING (
    is_owner_or_editor(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

-- ── 8. Fix events_personas policies ──

DROP POLICY IF EXISTS "Calendar members can view event personas" ON public.events_personas;
CREATE POLICY "Calendar members can view event personas"
  ON public.events_personas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = events_personas.event_id
      AND (
        is_member_of_calendar(e.calendar_id)
        OR (e.calendar_id IS NULL AND e.user_id = auth.uid())
      )
  ));

DROP POLICY IF EXISTS "Owner/editor can create event personas" ON public.events_personas;
CREATE POLICY "Owner/editor can create event personas"
  ON public.events_personas FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = events_personas.event_id
      AND (
        is_owner_or_editor(e.calendar_id)
        OR (e.calendar_id IS NULL AND e.user_id = auth.uid())
      )
  ));

DROP POLICY IF EXISTS "Owner/editor can delete event personas" ON public.events_personas;
CREATE POLICY "Owner/editor can delete event personas"
  ON public.events_personas FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = events_personas.event_id
      AND (
        is_owner_or_editor(e.calendar_id)
        OR (e.calendar_id IS NULL AND e.user_id = auth.uid())
      )
  ));

-- ── 9. Fix tasks policies ──

DROP POLICY IF EXISTS "Calendar members can view tasks" ON public.tasks;
CREATE POLICY "Calendar members can view tasks"
  ON public.tasks FOR SELECT
  USING (
    is_member_of_calendar(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Owner/editor can create tasks" ON public.tasks;
CREATE POLICY "Owner/editor can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    is_owner_or_editor(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Owner/editor can update tasks" ON public.tasks;
CREATE POLICY "Owner/editor can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    is_owner_or_editor(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Owner/editor can delete tasks" ON public.tasks;
CREATE POLICY "Owner/editor can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    is_owner_or_editor(calendar_id)
    OR (calendar_id IS NULL AND auth.uid() = user_id)
  );
