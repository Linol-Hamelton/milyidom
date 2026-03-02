import { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getListingById } from '@/services/listings';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/colors';

const { width: SCREEN_W } = Dimensions.get('window');

const AMENITY_ICONS: Record<string, string> = {
  WiFi: 'wifi-outline',
  'Бассейн': 'water-outline',
  'Парковка': 'car-outline',
  'Завтрак': 'cafe-outline',
  'Кондиционер': 'snow-outline',
  'Стиральная машина': 'shirt-outline',
  'Кухня': 'restaurant-outline',
  'Телевизор': 'tv-outline',
};

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const [imageIdx, setImageIdx] = useState(0);

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListingById(id),
    enabled: !!id,
  });

  const handleBook = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Войдите в аккаунт',
        'Для бронирования нужно авторизоваться',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Войти', onPress: () => router.push('/(auth)/login') },
        ],
      );
      return;
    }
    router.push(`/booking/${id}`);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.pine[500]} />
      </View>
    );
  }

  if (isError || !listing) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.rose[500]} />
        <Text style={styles.errorText}>Объявление не найдено</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = listing.images ?? [];
  const currentImage = images[imageIdx]?.url ?? null;
  const priceNum = parseFloat(listing.basePrice.toString());
  const price = priceNum.toLocaleString('ru-RU');

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={Colors.slate[900]} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={{ flex: 1, backgroundColor: Colors.sand[50] }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Image gallery */}
          <View style={styles.gallery}>
            {currentImage ? (
              <Image
                source={{ uri: currentImage }}
                style={styles.mainImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.mainImage, styles.imagePlaceholder]}>
                <Ionicons name="home-outline" size={64} color={Colors.pine[300]} />
              </View>
            )}

            {/* Dot indicators */}
            {images.length > 1 && (
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setImageIdx(i)}
                    style={[styles.dot, i === imageIdx && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.content}>
            {/* Title + rating */}
            <View style={styles.titleRow}>
              <Text style={styles.title}>{listing.title}</Text>
              {listing.rating > 0 && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.ratingText}>{listing.rating.toFixed(1)}</Text>
                  {listing.reviewCount > 0 && (
                    <Text style={styles.reviewCount}>({listing.reviewCount})</Text>
                  )}
                </View>
              )}
            </View>

            {/* Location */}
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={15} color={Colors.slate[400]} />
              <Text style={styles.location}>
                {listing.city}{listing.country ? `, ${listing.country}` : ''}
              </Text>
            </View>

            {/* Quick stats */}
            <View style={styles.statsRow}>
              {listing.guests > 0 && (
                <View style={styles.stat}>
                  <Ionicons name="people-outline" size={16} color={Colors.slate[500]} />
                  <Text style={styles.statText}>{listing.guests} гостей</Text>
                </View>
              )}
              {listing.bedrooms && (
                <View style={styles.stat}>
                  <Ionicons name="bed-outline" size={16} color={Colors.slate[500]} />
                  <Text style={styles.statText}>{listing.bedrooms} спален</Text>
                </View>
              )}
              {listing.bathrooms && (
                <View style={styles.stat}>
                  <Ionicons name="water-outline" size={16} color={Colors.slate[500]} />
                  <Text style={styles.statText}>{listing.bathrooms} ванных</Text>
                </View>
              )}
              {listing.instantBook && (
                <View style={styles.stat}>
                  <Ionicons name="flash-outline" size={16} color={Colors.pine[500]} />
                  <Text style={[styles.statText, { color: Colors.pine[500] }]}>Мгновенно</Text>
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Description */}
            {listing.description && (
              <>
                <Text style={styles.sectionTitle}>Об объекте</Text>
                <Text style={styles.description}>{listing.description}</Text>
                <View style={styles.divider} />
              </>
            )}

            {/* Amenities */}
            {listing.amenities && listing.amenities.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Удобства</Text>
                <View style={styles.amenitiesGrid}>
                  {listing.amenities.map((la) => (
                    <View key={la.amenity.name} style={styles.amenity}>
                      <Ionicons
                        name={(AMENITY_ICONS[la.amenity.name] ?? 'checkmark-outline') as React.ComponentProps<typeof Ionicons>['name']}
                        size={18}
                        color={Colors.pine[500]}
                      />
                      <Text style={styles.amenityText}>{la.amenity.name}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.divider} />
              </>
            )}

            {/* Host info */}
            {listing.host && (
              <>
                <Text style={styles.sectionTitle}>Хозяин</Text>
                <View style={styles.hostRow}>
                  <View style={styles.hostAvatar}>
                    <Text style={styles.hostAvatarText}>
                      {(listing.host.profile?.firstName?.[0] ?? listing.host.email[0]).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.hostName}>
                      {listing.host.profile?.firstName
                        ? `${listing.host.profile.firstName} ${listing.host.profile.lastName ?? ''}`
                        : listing.host.email}
                    </Text>
                    <Text style={styles.hostSince}>
                      На платформе с{' '}
                      {new Date(listing.host.createdAt).getFullYear()}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Bottom spacer for sticky footer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Sticky booking footer */}
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <View style={styles.footerInner}>
            <View>
              <Text style={styles.footerPrice}>₽{price}</Text>
              <Text style={styles.footerPerNight}>за ночь</Text>
            </View>
            <TouchableOpacity style={styles.bookBtn} onPress={handleBook}>
              <Text style={styles.bookBtnText}>Забронировать</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: Colors.sand[50] },
  errorText: { fontSize: 16, color: Colors.slate[600] },
  backBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.pine[500], borderRadius: 12 },
  backBtnText: { color: Colors.white, fontWeight: '600' },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },

  gallery: { position: 'relative' },
  mainImage: { width: SCREEN_W, height: 280 },
  imagePlaceholder: { backgroundColor: Colors.sand[100], justifyContent: 'center', alignItems: 'center' },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: Colors.white, width: 18 },

  content: { padding: 20 },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: Colors.slate[900], lineHeight: 26 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 14, fontWeight: '700', color: Colors.slate[800] },
  reviewCount: { fontSize: 12, color: Colors.slate[400] },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  location: { fontSize: 14, color: Colors.slate[500] },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 13, color: Colors.slate[600] },

  divider: { height: 1, backgroundColor: Colors.sand[100], marginVertical: 20 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.slate[900], marginBottom: 12 },
  description: { fontSize: 15, color: Colors.slate[600], lineHeight: 22 },

  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.sand[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.sand[200],
  },
  amenityText: { fontSize: 13, color: Colors.slate[700] },

  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.pine[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostAvatarText: { color: Colors.white, fontSize: 20, fontWeight: '700' },
  hostName: { fontSize: 15, fontWeight: '600', color: Colors.slate[900] },
  hostSince: { fontSize: 12, color: Colors.slate[400], marginTop: 2 },

  footer: { borderTopWidth: 1, borderTopColor: Colors.sand[100], backgroundColor: Colors.white },
  footerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  footerPrice: { fontSize: 22, fontWeight: '800', color: Colors.slate[900] },
  footerPerNight: { fontSize: 12, color: Colors.slate[400] },
  bookBtn: {
    backgroundColor: Colors.pine[500],
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  bookBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
