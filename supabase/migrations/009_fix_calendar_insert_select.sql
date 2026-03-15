-- ============================================================
-- Migration 009: Fix calendar creation RLS
-- Problem: INSERT on calendars with .select() fails because
-- the SELECT policy requires calendar membership, but the user
-- hasn't been added as a member yet at INSERT time.
-- Fix: Allow creators to see their own calendars via SELECT policy.
-- ============================================================

-- Fix calendars SELECT policy to also allow the creator
DROP POLICY IF EXISTS "Members can view their calendars" ON public.calendars;
CREATE POLICY "Members can view their calendars"
  ON public.calendars FOR SELECT
  USING (
    is_member_of_calendar(id)
    OR auth.uid() = created_by
  );
