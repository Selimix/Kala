-- ============================================================
-- Migration 003: Types d'activité, Lieux (Places), Personas
-- ============================================================

-- ── Fonction helper updated_at ──
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Nouveaux enums ──

CREATE TYPE activity_type AS ENUM (
  'deplacement',
  'reunion',
  'diner',
  'dejeuner',
  'appel',
  'visioconference',
  'rdv_medical',
  'sport',
  'courses',
  'administratif',
  'evenement_social',
  'travail_focus',
  'pause',
  'autre'
);

CREATE TYPE place_category AS ENUM (
  'restaurant',
  'bureau',
  'domicile',
  'salle_de_sport',
  'hopital',
  'cabinet_medical',
  'ecole',
  'commerce',
  'bar',
  'parc',
  'gare',
  'aeroport',
  'autre'
);

CREATE TYPE relationship_type AS ENUM (
  'collegue',
  'ami',
  'famille',
  'medecin',
  'client',
  'prestataire',
  'voisin',
  'autre'
);

-- ── Table places ──

CREATE TABLE public.places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  category place_category NOT NULL DEFAULT 'autre',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_places_user_name ON public.places(user_id, name);

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own places"
  ON public.places FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own places"
  ON public.places FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own places"
  ON public.places FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own places"
  ON public.places FOR DELETE USING (auth.uid() = user_id);

-- ── Table personas ──

CREATE TABLE public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  relationship relationship_type NOT NULL DEFAULT 'autre',
  notes TEXT,
  native_contact_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_personas_user_name ON public.personas(user_id, name);

ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own personas"
  ON public.personas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own personas"
  ON public.personas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own personas"
  ON public.personas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own personas"
  ON public.personas FOR DELETE USING (auth.uid() = user_id);

-- ── Table events_personas (junction) ──

CREATE TABLE public.events_personas (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, persona_id)
);

CREATE INDEX idx_events_personas_persona ON public.events_personas(persona_id);

ALTER TABLE public.events_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own event-persona links"
  ON public.events_personas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid()
  ));
CREATE POLICY "Users can create own event-persona links"
  ON public.events_personas FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own event-persona links"
  ON public.events_personas FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid()
  ));

-- ── Alter events table ──

ALTER TABLE public.events
  ADD COLUMN activity_type activity_type,
  ADD COLUMN place_id UUID REFERENCES public.places(id) ON DELETE SET NULL;

-- Migrer les anciennes categories vers activity_type
UPDATE public.events SET activity_type = CASE
  WHEN category = 'travail' THEN 'travail_focus'::activity_type
  WHEN category = 'personnel' THEN 'autre'::activity_type
  WHEN category = 'sante' THEN 'rdv_medical'::activity_type
  WHEN category = 'social' THEN 'evenement_social'::activity_type
  WHEN category = 'sport' THEN 'sport'::activity_type
  WHEN category = 'administratif' THEN 'administratif'::activity_type
  WHEN category = 'autre' THEN 'autre'::activity_type
  ELSE 'autre'::activity_type
END;

ALTER TABLE public.events
  ALTER COLUMN activity_type SET NOT NULL,
  ALTER COLUMN activity_type SET DEFAULT 'autre';

-- ── Trigger updated_at pour places et personas ──

CREATE TRIGGER update_places_updated_at
  BEFORE UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personas_updated_at
  BEFORE UPDATE ON public.personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
