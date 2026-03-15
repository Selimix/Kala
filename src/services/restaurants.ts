import { supabase } from './supabase';
import type { RestaurantResult } from '../types/restaurants';

export interface RestaurantDetails {
  fsq_id: string;
  name: string;
  address: string | null;
  description: string | null;
  tel: string | null;
  website: string | null;
  category: string | null;
  fsq_rating: number | null;
  fsq_price: number | null;
  photos: { url: string; thumb: string }[];
  hours: {
    display: string | null;
    open_now: boolean;
    regular: { day: number; open: string; close: string }[];
  } | null;
  tips: { text: string; created_at: string }[];
  tastes: string[];
  stats: { total_photos: number; total_ratings: number; total_tips: number } | null;
  social_media: { facebook_id?: string; instagram?: string; twitter?: string } | null;
}

export async function fetchRestaurantDetails(fsqId: string): Promise<RestaurantDetails | null> {
  try {
    const { data, error } = await supabase.functions.invoke('restaurant-details', {
      body: { fsq_id: fsqId },
    });

    if (error) {
      console.error('Erreur fetch détails restaurant:', error);
      return null;
    }

    return data as RestaurantDetails;
  } catch (error) {
    console.error('Erreur fetch détails restaurant:', error);
    return null;
  }
}

/**
 * Merge les détails Foursquare dans un RestaurantResult existant
 */
export function mergeDetails(
  restaurant: RestaurantResult,
  details: RestaurantDetails
): RestaurantResult {
  return {
    ...restaurant,
    description: details.description || restaurant.description,
    tel: details.tel || restaurant.tel,
    website: details.website || restaurant.website,
    category: details.category || restaurant.category,
    fsq_rating: details.fsq_rating ?? restaurant.fsq_rating,
    fsq_price: details.fsq_price ?? restaurant.fsq_price,
    photos: details.photos.length > 0 ? details.photos : restaurant.photos,
    hours: details.hours || restaurant.hours,
    tips: details.tips.length > 0 ? details.tips : restaurant.tips,
  };
}
