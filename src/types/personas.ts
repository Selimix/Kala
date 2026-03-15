export type RelationshipType =
  | 'collegue'
  | 'ami'
  | 'famille'
  | 'medecin'
  | 'client'
  | 'prestataire'
  | 'voisin'
  | 'autre';

export interface Persona {
  id: string;
  user_id: string;
  calendar_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: RelationshipType;
  notes: string | null;
  native_contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonaInput {
  name: string;
  email?: string;
  phone?: string;
  relationship?: RelationshipType;
  notes?: string;
  native_contact_id?: string;
}

export interface UpdatePersonaInput {
  name?: string;
  email?: string;
  phone?: string;
  relationship?: RelationshipType;
  notes?: string;
  native_contact_id?: string;
}
