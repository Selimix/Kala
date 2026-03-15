import { supabase } from './supabase';
import type { Persona, CreatePersonaInput, UpdatePersonaInput } from '../types/personas';

// ============================================================
// CRUD
// ============================================================

export async function getPersonas(calendarId?: string): Promise<Persona[]> {
  let query = supabase
    .from('personas')
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

export async function getPersonaById(id: string): Promise<Persona> {
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function searchPersonas(query: string, calendarId?: string): Promise<Persona[]> {
  let q = supabase
    .from('personas')
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

export async function createPersona(input: CreatePersonaInput, calendarId?: string): Promise<Persona> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('personas')
    .insert({
      user_id: user.id,
      calendar_id: calendarId || null,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      relationship: input.relationship || 'autre',
      notes: input.notes || null,
      native_contact_id: input.native_contact_id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePersona(id: string, updates: UpdatePersonaInput): Promise<Persona> {
  const { data, error } = await supabase
    .from('personas')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePersona(id: string): Promise<void> {
  const { error } = await supabase
    .from('personas')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// Résolution intelligente (utilisé par l'Edge Function)
// ============================================================

/**
 * Cherche une persona existante par nom, ou la crée si inexistante.
 * Utilisé par l'agent Claude pour résoudre automatiquement les contacts.
 */
export async function findOrCreatePersona(
  name: string,
  relationship?: string,
  calendarId?: string
): Promise<Persona> {
  // Chercher un match (case-insensitive) dans le scope approprié
  let query = supabase
    .from('personas')
    .select('*')
    .ilike('name', `%${name}%`)
    .limit(5);

  if (calendarId) {
    query = query.eq('calendar_id', calendarId);
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');
    query = query.eq('user_id', user.id);
  }

  const { data: personas } = await query;

  if (personas && personas.length > 0) {
    // Préférer le match exact
    const exact = personas.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    return exact || personas[0];
  }

  // Créer une nouvelle persona
  return createPersona({
    name,
    relationship: (relationship as Persona['relationship']) || 'autre',
  }, calendarId);
}

// ============================================================
// Junction table events_personas
// ============================================================

export async function linkPersonasToEvent(
  eventId: string,
  personaIds: string[]
): Promise<void> {
  if (personaIds.length === 0) return;

  // Supprimer les liens existants
  await supabase
    .from('events_personas')
    .delete()
    .eq('event_id', eventId);

  // Insérer les nouveaux liens
  const rows = personaIds.map((personaId) => ({
    event_id: eventId,
    persona_id: personaId,
  }));

  const { error } = await supabase
    .from('events_personas')
    .insert(rows);

  if (error) throw error;
}

export async function getPersonasForEvent(eventId: string): Promise<Persona[]> {
  const { data, error } = await supabase
    .from('events_personas')
    .select('persona:personas(*)')
    .eq('event_id', eventId);

  if (error) throw error;
  return (data || []).map((row: any) => row.persona);
}
