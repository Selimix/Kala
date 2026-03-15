-- ============================================================
-- Migration 008: Place ratings, visit log, Google Places fields
-- Enables: habit tracking, place ratings/reviews, Google Places integration
-- ============================================================

-- ── 1. Table place_ratings ──

CREATE TABLE public.place_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  criteria JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(place_id, user_id)
);

CREATE INDEX idx_place_ratings_place ON public.place_ratings(place_id);

ALTER TABLE public.place_ratings ENABLE ROW LEVEL SECURITY;

-- RLS: can view ratings for places in your calendars or your own places
CREATE POLICY "Members can view place ratings"
  ON public.place_ratings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.places p
    WHERE p.id = place_ratings.place_id
      AND (
        is_member_of_calendar(p.calendar_id)
        OR (p.calendar_id IS NULL AND p.user_id = auth.uid())
      )
  ));

CREATE POLICY "Users can create own ratings"
  ON public.place_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON public.place_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON public.place_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- ── 2. Table visit_log ──

CREATE TABLE public.visit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE,
  place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
  persona_ids UUID[] DEFAULT '{}',
  activity_type TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visit_log_user ON public.visit_log(user_id);
CREATE INDEX idx_visit_log_place ON public.visit_log(place_id);

ALTER TABLE public.visit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own visit log"
  ON public.visit_log FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_member_of_calendar(calendar_id)
  );

CREATE POLICY "Users can create own visit log"
  ON public.visit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── 3. ALTER places: Google Places fields + aggregates ──

ALTER TABLE public.places
  ADD COLUMN google_place_id TEXT,
  ADD COLUMN google_rating NUMERIC(2,1),
  ADD COLUMN google_price_level INT,
  ADD COLUMN photo_url TEXT,
  ADD COLUMN avg_rating NUMERIC(2,1),
  ADD COLUMN visit_count INT NOT NULL DEFAULT 0;

-- ── 4. Enable realtime ──

ALTER PUBLICATION supabase_realtime ADD TABLE public.place_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visit_log;
