import { supabase } from './supabase';
import type { Place, CreatePlaceInput, UpdatePlaceInput, PlaceCategory, PlaceRating } from '../types/places';
import type { ActivityType } from '../constants/activity-types';

// ============================================================
// CRUD
// ============================================================

export async function getPlaces(calendarId?: string): Promise<Place[]> {
  let query = supabase
    .from('places')
    .select('*')
    .order('name');

  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPlaceById(id: string): Promise<Place> {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function searchPlaces(query: string, calendarId?: string): Promise<Place[]> {
  let q = supabase
    .from('places')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(10);

  if (calendarId) {
    q = q.eq('calendar_id', calendarId);
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    q = q.eq('user_id', user.id);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createPlace(input: CreatePlaceInput, calendarId?: string): Promise<Place> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('places')
    .insert({
      user_id: user.id,
      calendar_id: calendarId || null,
      name: input.name,
      address: input.address || null,
      category: input.category || 'autre',
      latitude: input.latitude || null,
      longitude: input.longitude || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlace(id: string, updates: UpdatePlaceInput): Promise<Place> {
  const { data, error } = await supabase
    .from('places')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlace(id: string): Promise<void> {
  const { error } = await supabase
    .from('places')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// Résolution intelligente (utilisé par l'Edge Function)
// ============================================================

/**
 * Cherche un lieu existant par nom, ou le crée si inexistant.
 * Utilisé par l'agent Claude pour résoudre automatiquement les lieux.
 */
export async function findOrCreatePlace(
  name: string,
  category?: PlaceCategory,
  calendarId?: string
): Promise<Place> {
  // Chercher un match exact (case-insensitive) dans le scope approprié
  let query = supabase
    .from('places')
    .select('*')
    .ilike('name', name)
    .limit(5);

  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    query = query.eq('user_id', user.id);
  }

  const { data: places } = await query;

  if (places && places.length > 0) {
    // Préférer le match exact
    const exact = places.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    return exact || places[0];
  }

  // Créer un nouveau lieu
  return createPlace({
    name,
    category: category || 'autre',
  }, calendarId);
}

// ============================================================
// Inférence de catégorie de lieu depuis le type d'activité
// ============================================================

export function inferPlaceCategory(activityType: ActivityType): PlaceCategory {
  const mapping: Partial<Record<ActivityType, PlaceCategory>> = {
    diner: 'restaurant',
    dejeuner: 'restaurant',
    rdv_medical: 'cabinet_medical',
    sport: 'salle_de_sport',
    travail_focus: 'bureau',
    reunion: 'bureau',
    courses: 'commerce',
    evenement_social: 'bar',
    deplacement: 'gare',
  };
  return mapping[activityType] || 'autre';
}

// ============================================================
// Place ratings
// ============================================================

export async function ratePlace(
  placeId: string,
  rating: number,
  comment?: string,
  criteria?: Record<string, number>
): Promise<PlaceRating> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  // Upsert rating (one per user per place)
  const { data, error } = await supabase
    .from('place_ratings')
    .upsert({
      place_id: placeId,
      user_id: user.id,
      rating,
      comment: comment || null,
      criteria: criteria || {},
    }, { onConflict: 'place_id,user_id' })
    .select()
    .single();
  if (error) throw error;

  // Recalculate avg_rating
  const { data: ratings } = await supabase
    .from('place_ratings')
    .select('rating')
    .eq('place_id', placeId);

  if (ratings && ratings.length > 0) {
    const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    await supabase
      .from('places')
      .update({ avg_rating: Math.round(avg * 10) / 10 })
      .eq('id', placeId);
  }

  return data;
}

export async function getPlaceRatings(placeId: string): Promise<PlaceRating[]> {
  const { data, error } = await supabase
    .from('place_ratings')
    .select('*')
    .eq('place_id', placeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================
// Visit logging (habits tracking)
// ============================================================

export async function logVisit(
  placeId: string | null,
  personaIds?: string[],
  activityType?: string,
  calendarId?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  await supabase.from('visit_log').insert({
    user_id: user.id,
    calendar_id: calendarId || null,
    place_id: placeId,
    persona_ids: personaIds || [],
    activity_type: activityType || null,
  });

  // Increment visit_count on place
  if (placeId) {
    const { data: place } = await supabase
      .from('places')
      .select('visit_count')
      .eq('id', placeId)
      .single();

    if (place) {
      await supabase
        .from('places')
        .update({ visit_count: (place.visit_count || 0) + 1 })
        .eq('id', placeId);
    }
  }
}

export async function getTopPlaces(
  calendarId?: string,
  category?: PlaceCategory,
  limit: number = 5
): Promise<Place[]> {
  let query = supabase
    .from('places')
    .select('*')
    .gt('visit_count', 0)
    .order('visit_count', { ascending: false })
    .order('avg_rating', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  }
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
