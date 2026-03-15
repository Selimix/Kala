import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { StarRating } from '../ui/StarRating';
import { PriceLevel } from '../ui/PriceLevel';
import { fetchRestaurantDetails, mergeDetails } from '../../services/restaurants';
import type { RestaurantResult } from '../../types/restaurants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_HEIGHT = 200;

interface Props {
  restaurant: RestaurantResult | null;
  visible: boolean;
  onClose: () => void;
  onChoose: (restaurant: RestaurantResult) => void;
}

const PRICE_LABELS: Record<number, string> = {
  1: 'Bon marché',
  2: 'Modéré',
  3: 'Cher',
  4: 'Très cher',
};

function getRating(r: RestaurantResult): number | null {
  if (r.source === 'favori' && r.avg_rating) return r.avg_rating;
  if (r.source === 'foursquare' && r.fsq_rating) return r.fsq_rating;
  return null;
}

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const url = Platform.select({
    ios: `maps://maps.apple.com/?q=${encoded}`,
    android: `geo:0,0?q=${encoded}`,
    default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  });
  if (url) Linking.openURL(url);
}

function formatTipDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export function RestaurantDetailModal({ restaurant, visible, onClose, onChoose }: Props) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [enrichedRestaurant, setEnrichedRestaurant] = useState<RestaurantResult | null>(null);
  const [loading, setLoading] = useState(false);
  const lastFetchedId = useRef<string | null>(null);

  // Fetch rich details when modal opens for a Foursquare restaurant
  useEffect(() => {
    if (!visible || !restaurant) {
      return;
    }

    // Reset photo index
    setActivePhotoIndex(0);

    // If it's a Foursquare restaurant with an fsq_id and we haven't fetched details yet
    if (restaurant.source === 'foursquare' && restaurant.fsq_id && lastFetchedId.current !== restaurant.fsq_id) {
      setLoading(true);
      setEnrichedRestaurant(null);
      fetchRestaurantDetails(restaurant.fsq_id)
        .then((details) => {
          if (details) {
            const merged = mergeDetails(restaurant, details);
            setEnrichedRestaurant(merged);
            lastFetchedId.current = restaurant.fsq_id!;
          }
        })
        .finally(() => setLoading(false));
    } else if (restaurant.source === 'favori' || enrichedRestaurant?.fsq_id === restaurant.fsq_id) {
      // For favorites or already-fetched restaurants, use existing data
    } else {
      setEnrichedRestaurant(null);
    }
  }, [visible, restaurant?.fsq_id]);

  if (!restaurant) return null;

  // Use enriched data if available, otherwise base data
  const displayRestaurant = enrichedRestaurant || restaurant;
  const isFavori = displayRestaurant.source === 'favori';
  const rating = getRating(displayRestaurant);
  const photos = displayRestaurant.photos || [];
  const tips = displayRestaurant.tips || [];
  const hasPhotos = photos.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.sheet}>
          {/* Drag indicator */}
          <View style={styles.dragPill} />

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Loading indicator */}
          {loading && (
            <View style={styles.loadingBar}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Chargement des détails...</Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={true}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Photo carousel or colored header */}
            {hasPhotos ? (
              <View style={styles.photoSection}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
                    setActivePhotoIndex(index);
                  }}
                  scrollEventThrottle={16}
                >
                  {photos.map((photo, i) => (
                    <Image
                      key={i}
                      source={{ uri: photo.url }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                {/* Photo dots */}
                {photos.length > 1 && (
                  <View style={styles.photoDots}>
                    {photos.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.photoDot,
                          i === activePhotoIndex && styles.photoDotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
                {/* Badge on top of photo */}
                <View style={[styles.photoBadge, { backgroundColor: isFavori ? Colors.authGold : Colors.primary }]}>
                  <Ionicons name={isFavori ? 'heart' : 'compass'} size={11} color="#fff" />
                  <Text style={styles.photoBadgeText}>{isFavori ? 'Favori' : 'Foursquare'}</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.colorHeader, { backgroundColor: isFavori ? Colors.authGold : Colors.primary }]}>
                <View style={styles.headerBadge}>
                  <Ionicons name={isFavori ? 'heart' : 'compass'} size={12} color="#fff" />
                  <Text style={styles.headerBadgeText}>{isFavori ? 'Favori' : 'Foursquare'}</Text>
                </View>
              </View>
            )}

            {/* Name + Category */}
            <View style={styles.nameSection}>
              <Text style={styles.name}>{displayRestaurant.name}</Text>
              {displayRestaurant.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{displayRestaurant.category}</Text>
                </View>
              )}
              {/* Open/Closed badge */}
              {displayRestaurant.hours && (
                <View style={[
                  styles.openBadge,
                  { backgroundColor: displayRestaurant.hours.open_now ? 'rgba(0,184,148,0.12)' : 'rgba(225,112,85,0.12)' },
                ]}>
                  <View style={[
                    styles.openDot,
                    { backgroundColor: displayRestaurant.hours.open_now ? Colors.success : Colors.error },
                  ]} />
                  <Text style={[
                    styles.openText,
                    { color: displayRestaurant.hours.open_now ? Colors.success : Colors.error },
                  ]}>
                    {displayRestaurant.hours.open_now ? 'Ouvert' : 'Fermé'}
                  </Text>
                </View>
              )}
            </View>

            {/* Description */}
            {displayRestaurant.description && (
              <View style={styles.section}>
                <Text style={styles.description}>{displayRestaurant.description}</Text>
              </View>
            )}

            {/* Details grid */}
            <View style={styles.detailsGrid}>
              {/* Address */}
              {displayRestaurant.address && (
                <TouchableOpacity
                  style={styles.detailCard}
                  onPress={() => openMaps(displayRestaurant.address!)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.detailCardIcon, { backgroundColor: 'rgba(108,92,231,0.1)' }]}>
                    <Ionicons name="location" size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.detailCardLabel}>Adresse</Text>
                  <Text style={styles.detailCardValue} numberOfLines={2}>{displayRestaurant.address}</Text>
                </TouchableOpacity>
              )}

              {/* Rating */}
              {rating != null && (
                <View style={styles.detailCard}>
                  <View style={[styles.detailCardIcon, { backgroundColor: 'rgba(184,149,106,0.12)' }]}>
                    <Ionicons name="star" size={18} color={Colors.authGold} />
                  </View>
                  <Text style={styles.detailCardLabel}>Note</Text>
                  <View style={styles.ratingRow}>
                    <StarRating rating={rating} size={14} />
                    <Text style={styles.ratingNumber}>{rating.toFixed(1)}</Text>
                  </View>
                </View>
              )}

              {/* Price */}
              {displayRestaurant.fsq_price != null && displayRestaurant.fsq_price > 0 && (
                <View style={styles.detailCard}>
                  <View style={[styles.detailCardIcon, { backgroundColor: 'rgba(0,184,148,0.1)' }]}>
                    <Ionicons name="cash" size={18} color={Colors.success} />
                  </View>
                  <Text style={styles.detailCardLabel}>Prix</Text>
                  <PriceLevel level={displayRestaurant.fsq_price} size={14} />
                  <Text style={styles.priceLabel}>{PRICE_LABELS[displayRestaurant.fsq_price] || ''}</Text>
                </View>
              )}

              {/* Visits (favorites) */}
              {isFavori && displayRestaurant.visit_count != null && displayRestaurant.visit_count > 0 && (
                <View style={styles.detailCard}>
                  <View style={[styles.detailCardIcon, { backgroundColor: 'rgba(162,155,254,0.12)' }]}>
                    <Ionicons name="repeat" size={18} color={Colors.primaryLight} />
                  </View>
                  <Text style={styles.detailCardLabel}>Visites</Text>
                  <Text style={styles.detailCardBigValue}>{displayRestaurant.visit_count}</Text>
                </View>
              )}
            </View>

            {/* Hours */}
            {displayRestaurant.hours?.display && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time-outline" size={18} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Horaires</Text>
                </View>
                <View style={styles.hoursCard}>
                  <Text style={styles.hoursText}>{displayRestaurant.hours.display}</Text>
                </View>
              </View>
            )}

            {/* Contact */}
            {(displayRestaurant.tel || displayRestaurant.website) && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="call-outline" size={18} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Contact</Text>
                </View>
                <View style={styles.contactRow}>
                  {displayRestaurant.tel && (
                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() => Linking.openURL(`tel:${displayRestaurant.tel}`)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="call" size={16} color={Colors.primary} />
                      <Text style={styles.contactBtnText}>{displayRestaurant.tel}</Text>
                    </TouchableOpacity>
                  )}
                  {displayRestaurant.website && (
                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() => Linking.openURL(displayRestaurant.website!)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="globe" size={16} color={Colors.primary} />
                      <Text style={styles.contactBtnText} numberOfLines={1}>Site web</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Tips / Reviews */}
            {tips.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Avis ({tips.length})</Text>
                </View>
                {tips.map((tip, i) => (
                  <View key={i} style={styles.tipCard}>
                    <View style={styles.tipHeader}>
                      <View style={styles.tipAvatar}>
                        <Ionicons name="person" size={14} color={Colors.textSecondary} />
                      </View>
                      <Text style={styles.tipDate}>{formatTipDate(tip.created_at)}</Text>
                    </View>
                    <Text style={styles.tipText}>{tip.text}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Spacer for buttons */}
            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Sticky action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => onChoose(displayRestaurant)}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Choisir ce lieu</Text>
            </TouchableOpacity>

            <View style={styles.secondaryRow}>
              {displayRestaurant.address && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => openMaps(displayRestaurant.address!)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="map-outline" size={16} color={Colors.primary} />
                  <Text style={styles.secondaryBtnText}>Carte</Text>
                </TouchableOpacity>
              )}
              {displayRestaurant.tel && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => Linking.openURL(`tel:${displayRestaurant.tel}`)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="call-outline" size={16} color={Colors.primary} />
                  <Text style={styles.secondaryBtnText}>Appeler</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 16 : 32,
    maxHeight: '92%',
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(108,92,231,0.06)',
  },
  loadingText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 8,
  },

  // -- Photo carousel --
  photoSection: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  photo: {
    width: SCREEN_WIDTH - 32,
    height: PHOTO_HEIGHT,
  },
  photoDots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  photoDotActive: {
    backgroundColor: '#fff',
    width: 16,
  },
  photoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  photoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },

  // -- Color header (no photos) --
  colorHeader: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 20,
    padding: 20,
    paddingTop: 16,
    minHeight: 80,
    justifyContent: 'flex-end',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // -- Name section --
  nameSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 28,
    width: '100%',
  },
  categoryBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  openText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // -- Description --
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },

  // -- Section --
  section: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },

  // -- Details grid --
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  detailCard: {
    width: '47%' as any,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  detailCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  detailCardLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailCardValue: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  detailCardBigValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.authGold,
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // -- Hours --
  hoursCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
  },
  hoursText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },

  // -- Contact --
  contactRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  contactBtnText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },

  // -- Tips --
  tipCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tipText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
  },

  // -- Actions --
  actions: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
