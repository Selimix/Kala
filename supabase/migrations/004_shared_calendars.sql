-- ============================================================
-- Migration 004: Calendriers partages
-- Ajoute: calendars, calendar_members, invite_codes
-- Modifie: profiles, events, places, personas (ajout calendar_id)
-- Remplace les RLS user_id par calendar membership
-- ============================================================

-- ── 1. Enum role ──
CREATE TYPE calendar_role AS ENUM ('owner', 'editor', 'viewer');

-- ══════════════════════════════════════════════════════════════
-- TABLES FIRST (no RLS policies yet to avoid circular refs)
-- ══════════════════════════════════════════════════════════════

-- ── 2. Table calendars ──
CREATE TABLE public.calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '📅',
  color TEXT DEFAULT '#B8956A',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendars_created_by ON public.calendars(created_by);
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_calendars_updated_at
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 3. Table calendar_members ──
CREATE TABLE public.calendar_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role calendar_role NOT NULL DEFAULT 'editor',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (calendar_id, user_id)
);

CREATE INDEX idx_calendar_members_user ON public.calendar_members(user_id);
CREATE INDEX idx_calendar_members_calendar ON public.calendar_members(calendar_id);
ALTER TABLE public.calendar_members ENABLE ROW LEVEL SECURITY;

-- ── 4. Table invite_codes ──
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role calendar_role NOT NULL DEFAULT 'editor',
  max_uses INT,
  use_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX idx_invite_codes_calendar ON public.invite_codes(calendar_id);
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- RLS POLICIES (all tables exist now, safe to cross-reference)
-- ══════════════════════════════════════════════════════════════

-- ── Calendars policies ──
CREATE POLICY "Members can view their calendars"
  ON public.calendars FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.calendar_members
    WHERE calendar_members.calendar_id = calendars.id
      AND calendar_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can create calendars"
  ON public.calendars FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner can update calendar"
  ON public.calendars FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_members
    WHERE calendar_members.calendar_id = calendars.id
      AND calendar_members.user_id = auth.uid()
      AND calendar_members.role = 'owner'
  ));

CREATE POLICY "Owner can delete calendar"
  ON public.calendars FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_members
    WHERE calendar_members.calendar_id = calendars.id
      AND calendar_members.user_id = auth.uid()
      AND calendar_members.role = 'owner'
  ));

-- ── Calendar members policies ──
CREATE POLICY "Members can view calendar members"
  ON public.calendar_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.calendar_members AS cm
    WHERE cm.calendar_id = calendar_members.calendar_id
      AND cm.user_id = auth.uid()
  ));

CREATE POLICY "Authorized users can add members"
  ON public.calendar_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.calendar_members AS cm
      WHERE cm.calendar_id = calendar_members.calendar_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Owner can update member roles"
  ON public.calendar_members FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_members AS cm
    WHERE cm.calendar_id = calendar_members.calendar_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'owner'
  ));

CREATE POLICY "Members can leave or owner can remove"
  ON public.calendar_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.calendar_members AS cm
      WHERE cm.calendar_id = calendar_members.calendar_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );

-- ── Invite codes policies ──
CREATE POLICY "Members can view invite codes"
  ON public.invite_codes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.calendar_members
    WHERE calendar_members.calendar_id = invite_codes.calendar_id
      AND calendar_members.user_id = auth.uid()
  ));

CREATE POLICY "Owner/editor can create invite codes"
  ON public.invite_codes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_members
    WHERE calendar_members.calendar_id = invite_codes.calendar_id
      AND calendar_members.user_id = auth.uid()
      AND calendar_members.role IN ('owner', 'editor')
  ));

CREATE POLICY "Owner can delete invite codes"
  ON public.invite_codes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_members
    WHERE calendar_members.calendar_id = invite_codes.calendar_id
      AND calendar_members.user_id = auth.uid()
      AND calendar_members.role = 'owner'
  ));

CREATE POLICY "Owner/editor can update invite codes"
  ON public.invite_codes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_members
    WHERE calendar_members.calendar_id = invite_codes.calendar_id
      AND calendar_members.user_id = auth.uid()
      AND calendar_members.role IN ('owner', 'editor')
  ));

-- ══════════════════════════════════════════════════════════════
-- ALTER EXISTING TABLES
-- ══════════════════════════════════════════════════════════════

-- ── 5. Alter profiles ──
ALTER TABLE public.profiles
  ADD COLUMN active_calendar_id UUID REFERENCES public.calendars(id) ON DELETE SET NULL,
  ADD COLUMN has_completed_onboarding BOOLEAN NOT NULL DEFAULT false;

-- ── 6. Alter events — add calendar_id, created_by ──
ALTER TABLE public.events
  ADD COLUMN calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE,
  ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill created_by from user_id
UPDATE public.events SET created_by = user_id WHERE created_by IS NULL;

CREATE INDEX idx_events_calendar_time ON public.events(calendar_id, start_time);

-- Drop old events RLS policies
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;

-- New events RLS policies (calendar membership + legacy fallback)
CREATE POLICY "Calendar members can view events"
  ON public.events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = events.calendar_id
        AND calendar_members.user_id = auth.uid()
    )
    OR (events.calendar_id IS NULL AND auth.uid() = events.user_id)
  );

CREATE POLICY "Owner/editor can create events"
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = events.calendar_id
        AND calendar_members.user_id = auth.uid()
        AND calendar_members.role IN ('owner', 'editor')
    )
    OR (events.calendar_id IS NULL AND auth.uid() = events.user_id)
  );

CREATE POLICY "Owner/editor can update events"
  ON public.events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = events.calendar_id
        AND calendar_members.user_id = auth.uid()
        AND calendar_members.role IN ('owner', 'editor')
    )
    OR (events.calendar_id IS NULL AND auth.uid() = events.user_id)
  );

CREATE POLICY "Owner/editor can delete events"
  ON public.events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = events.calendar_id
        AND calendar_members.user_id = auth.uid()
        AND calendar_members.role IN ('owner', 'editor')
    )
    OR (events.calendar_id IS NULL AND auth.uid() = events.user_id)
  );

-- ── 7. Alter places — add calendar_id ──
ALTER TABLE public.places
  ADD COLUMN calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE;

CREATE INDEX idx_places_calendar ON public.places(calendar_id);

-- Drop old places RLS policies
DROP POLICY IF EXISTS "Users can view own places" ON public.places;
DROP POLICY IF EXISTS "Users can create own places" ON public.places;
DROP POLICY IF EXISTS "Users can update own places" ON public.places;
DROP POLICY IF EXISTS "Users can delete own places" ON public.places;

-- New places RLS policies
CREATE POLICY "Calendar members can view places"
  ON public.places FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = places.calendar_id
        AND calendar_members.user_id = auth.uid()
    )
    OR (places.calendar_id IS NULL AND auth.uid() = places.user_id)
  );

CREATE POLICY "Owner/editor can create places"
  ON public.places FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = places.calendar_id
        AND calendar_members.user_id = auth.uid()
        AND calendar_members.role IN ('owner', 'editor')
    )
    OR (places.calendar_id IS NULL AND auth.uid() = places.user_id)
  );

CREATE POLICY "Owner/editor can update places"
  ON public.places FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = places.calendar_id
        AND calendar_members.user_id = auth.uid()
        AND calendar_members.role IN ('owner', 'editor')
    )
    OR (places.calendar_id IS NULL AND auth.uid() = places.user_id)
  );

CREATE POLICY "Owner/editor can delete places"
  ON public.places FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = places.calendar_id
        AND calendar_members.user_id = auth.uid()
        AND calendar_members.role IN ('owner', 'editor')
    )
    OR (places.calendar_id IS NULL AND auth.uid() = places.user_id)
  );

-- ── 8. Alter personas — add calendar_id ──
ALTER TABLE public.personas
  ADD COLUMN calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE;

CREATE INDEX idx_personas_calendar ON public.personas(calendar_id);

-- Drop old personas RLS policies
DROP POLICY IF EXISTS "Users can view own personas" ON public.personas;
DROP POLICY IF EXISTS "Users can create own personas" ON public.personas;
DROP POLICY IF EXISTS "Users can update own personas" ON public.personas;
DROP POLICY IF EXISTS "Users can delete own personas" ON public.personas;

-- New personas RLS policies
CREATE POLICY "Calendar members can view personas"
  ON public.personas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = personas.calendar_id
        AND calendar_members.user_id = auth.uid()
    )
    OR (personas.calendar_id IS NULL AND auth.uid() = personas.user_id)
  );

CREATE POLICY "Owner/editor can create personas"
  ON public.personas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = personas.calendar_id
        AND calendar_members.user_id = auth.uid()
        AND calendar_members.role IN ('owner', 'editor')
    )
    OR (personas.calendar_id IS NULL AND auth.uid() = personas.user_id)
  );

CREATE POLICY "Owner/editor can update personas"
  ON public.personas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = personas.calendar_id
        AND calendar_members.user_id = auth.uid()
        AND calendar_members.role IN ('owner', 'editor')
    )
    OR (personas.calendar_id IS NULL AND auth.uid() = personas.user_id)
  );

CREATE POLICY "Owner/editor can delete personas"
  ON public.personas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_members
      WHERE calendar_members.calendar_id = personas.calendar_id
        AND calendar_members.user_id = auth.uid()
        AND calendar_members.role IN ('owner', 'editor')
    )
    OR (personas.calendar_id IS NULL AND auth.uid() = personas.user_id)
  );

-- ── 9. Update events_personas RLS to use calendar membership ──
DROP POLICY IF EXISTS "Users can view own event-persona links" ON public.events_personas;
DROP POLICY IF EXISTS "Users can create own event-persona links" ON public.events_personas;
DROP POLICY IF EXISTS "Users can delete own event-persona links" ON public.events_personas;

CREATE POLICY "Calendar members can view event personas"
  ON public.events_personas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.calendar_members cm ON cm.calendar_id = e.calendar_id
    WHERE e.id = events_personas.event_id
      AND cm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = events_personas.event_id
      AND e.calendar_id IS NULL
      AND e.user_id = auth.uid()
  ));

CREATE POLICY "Owner/editor can create event personas"
  ON public.events_personas FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.calendar_members cm ON cm.calendar_id = e.calendar_id
    WHERE e.id = events_personas.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'editor')
  ) OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = events_personas.event_id
      AND e.calendar_id IS NULL
      AND e.user_id = auth.uid()
  ));

CREATE POLICY "Owner/editor can delete event personas"
  ON public.events_personas FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.calendar_members cm ON cm.calendar_id = e.calendar_id
    WHERE e.id = events_personas.event_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'editor')
  ) OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = events_personas.event_id
      AND e.calendar_id IS NULL
      AND e.user_id = auth.uid()
  ));

-- ── 10. Helper function: generate invite code ──
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'KAL-';
  i INT;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ── 11. Helper function: join calendar by code ──
CREATE OR REPLACE FUNCTION public.join_calendar_by_code(code_input TEXT)
RETURNS JSON AS $$
DECLARE
  invite RECORD;
  cal RECORD;
  existing RECORD;
BEGIN
  -- Find valid invite code
  SELECT * INTO invite FROM public.invite_codes
  WHERE code = upper(code_input)
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses);

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Code invalide ou expiré');
  END IF;

  -- Check if already a member
  SELECT * INTO existing FROM public.calendar_members
  WHERE calendar_id = invite.calendar_id AND user_id = auth.uid();

  IF FOUND THEN
    RETURN json_build_object('error', 'Déjà membre de ce calendrier', 'calendar_id', invite.calendar_id);
  END IF;

  -- Add member
  INSERT INTO public.calendar_members (calendar_id, user_id, role)
  VALUES (invite.calendar_id, auth.uid(), invite.role);

  -- Increment usage
  UPDATE public.invite_codes SET use_count = use_count + 1 WHERE id = invite.id;

  -- Get calendar info
  SELECT * INTO cal FROM public.calendars WHERE id = invite.calendar_id;

  -- Set as active calendar
  UPDATE public.profiles SET active_calendar_id = invite.calendar_id WHERE id = auth.uid();

  RETURN json_build_object(
    'success', true,
    'calendar_id', cal.id,
    'calendar_name', cal.name,
    'role', invite.role::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 12. Realtime for calendar_members ──
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_members;
