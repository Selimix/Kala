import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { StarRating } from '../ui/StarRating';
import { PriceLevel } from '../ui/PriceLevel';
import type { RestaurantResult } from '../../types/restaurants';

const CARD_GAP = 8;

interface Props {
  restaurants: RestaurantResult[];
  onSelect: (restaurant: RestaurantResult) => void;
}

function getRating(r: RestaurantResult): number | null {
  if (r.source === 'favori' && r.avg_rating) return r.avg_rating;
  if (r.source === 'foursquare' && r.fsq_rating) return r.fsq_rating;
  return null;
}

export function RestaurantCarousel({ restaurants, onSelect }: Props) {
  if (!restaurants.length) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>
        <Ionicons name="restaurant-outline" size={13} color={Colors.textSecondary} />
        {'  '}Restaurants trouvés
      </Text>
      <View style={styles.grid}>
        {restaurants.map((restaurant, index) => {
          const isFavori = restaurant.source === 'favori';
          const rating = getRating(restaurant);
          const thumbnail = restaurant.photos?.[0]?.thumb;

          return (
            <TouchableOpacity
              key={`${restaurant.name}-${index}`}
              style={styles.card}
              onPress={() => onSelect(restaurant)}
              activeOpacity={0.8}
            >
              {/* Photo ou barre colorée */}
              {thumbnail ? (
                <Image source={{ uri: thumbnail }} style={styles.thumbnail} resizeMode="cover" />
              ) : (
                <View style={[styles.topBar, { backgroundColor: isFavori ? Colors.authGold : Colors.primary }]} />
              )}

              {/* Badge source */}
              <View style={[styles.badge, { backgroundColor: isFavori ? 'rgba(184,149,106,0.15)' : 'rgba(108,92,231,0.10)' }]}>
                <Ionicons
                  name={isFavori ? 'heart' : 'compass'}
                  size={9}
                  color={isFavori ? Colors.authGold : Colors.primary}
                />
                <Text style={[styles.badgeText, { color: isFavori ? Colors.authGold : Colors.primary }]}>
                  {isFavori ? 'Favori' : 'Nouveau'}
                </Text>
              </View>

              {/* Contenu */}
              <View style={styles.cardContent}>
                <Text style={styles.name} numberOfLines={2}>{restaurant.name}</Text>
                {restaurant.category && (
                  <Text style={styles.category} numberOfLines={1}>{restaurant.category}</Text>
                )}
                {restaurant.address && (
                  <Text style={styles.address} numberOfLines={1}>{restaurant.address}</Text>
                )}
              </View>

              {/* Rating + Price + Status en bas */}
              <View style={styles.cardFooter}>
                <View style={styles.footerLeft}>
                  {rating ? (
                    <View style={styles.ratingRow}>
                      <StarRating rating={rating} size={10} />
                      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                    </View>
                  ) : (
                    <Text style={styles.noRating}>Pas de note</Text>
                  )}
                  {restaurant.fsq_price != null && restaurant.fsq_price > 0 && (
                    <PriceLevel level={restaurant.fsq_price} size={9} />
                  )}
                </View>
                {/* Open/closed dot */}
                {restaurant.hours && (
                  <View style={[
                    styles.openDot,
                    { backgroundColor: restaurant.hours.open_now ? Colors.success : Colors.error },
                  ]} />
                )}
              </View>

              {/* Visit count pour favoris */}
              {isFavori && restaurant.visit_count != null && restaurant.visit_count > 0 && (
                <View style={styles.visitRow}>
                  <Ionicons name="repeat-outline" size={10} color={Colors.textSecondary} />
                  <Text style={styles.visitText}>{restaurant.visit_count} visite{restaurant.visit_count > 1 ? 's' : ''}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    width: `${(100 - 3) / 2}%` as any, // ~48.5% pour 2 colonnes avec gap
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: '0 3px 8px rgba(0,0,0,0.08)',
      },
    }),
  },
  thumbnail: {
    width: '100%',
    height: 80,
  },
  topBar: {
    height: 3,
    width: '100%',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 8,
    marginHorizontal: 10,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  cardContent: {
    paddingHorizontal: 10,
    paddingTop: 6,
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 18,
  },
  category: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  address: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardFooter: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.authGold,
  },
  noRating: {
    fontSize: 10,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  visitText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
});
