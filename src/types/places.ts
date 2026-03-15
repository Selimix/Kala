export type PlaceCategory =
  | 'restaurant'
  | 'bureau'
  | 'domicile'
  | 'salle_de_sport'
  | 'hopital'
  | 'cabinet_medical'
  | 'ecole'
  | 'commerce'
  | 'bar'
  | 'parc'
  | 'gare'
  | 'aeroport'
  | 'autre';

export interface Place {
  id: string;
  user_id: string;
  calendar_id: string | null;
  name: string;
  address: string | null;
  category: PlaceCategory;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  google_rating: number | null;
  google_price_level: number | null;
  photo_url: string | null;
  avg_rating: number | null;
  visit_count: number;
  created_at: string;
  updated_at: string;
}

export interface PlaceRating {
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  criteria: Record<string, number>;
  created_at: string;
}

export interface CreatePlaceInput {
  name: string;
  address?: string;
  category?: PlaceCategory;
  latitude?: number;
  longitude?: number;
}

export interface UpdatePlaceInput {
  name?: string;
  address?: string;
  category?: PlaceCategory;
  latitude?: number;
  longitude?: number;
}
