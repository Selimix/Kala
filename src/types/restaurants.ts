export interface RestaurantPhoto {
  url: string;
  thumb: string;
}

export interface RestaurantHours {
  display: string | null;
  open_now: boolean;
}

export interface RestaurantTip {
  text: string;
  created_at: string;
}

export interface RestaurantResult {
  name: string;
  address: string | null;
  category?: string;
  avg_rating?: number | null;
  visit_count?: number;
  fsq_rating?: number | null;
  fsq_price?: number | null;
  fsq_id?: string | null;
  description?: string | null;
  tel?: string | null;
  website?: string | null;
  photos?: RestaurantPhoto[];
  hours?: RestaurantHours | null;
  tips?: RestaurantTip[];
  source: 'favori' | 'foursquare';
}

export interface SearchRestaurantsResult {
  favorites: RestaurantResult[];
  external_results: RestaurantResult[];
  total: number;
}
