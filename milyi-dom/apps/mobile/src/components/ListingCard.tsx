import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import type { Listing } from '@/services/listings';

interface Props {
  item: Listing;
}

export function ListingCard({ item }: Props) {
  const mainImage = item.images?.[0]?.url ?? null;
  const price = parseFloat(item.basePrice.toString()).toLocaleString('ru-RU');

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={() => router.push(`/listing/${item.id}`)}
    >
      {/* Image */}
      <View style={styles.imageWrap}>
        {mainImage ? (
          <Image source={{ uri: mainImage }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="home-outline" size={40} color={Colors.pine[300]} />
          </View>
        )}

        {/* Instant book badge */}
        {item.instantBook && (
          <View style={styles.instantBadge}>
            <Ionicons name="flash" size={11} color={Colors.white} />
            <Text style={styles.instantText}>Мгновенно</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {(item.rating ?? 0) > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.rating}>{(item.rating ?? 0).toFixed(1)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.city} numberOfLines={1}>
          {item.city}
          {item.country ? `, ${item.country}` : ''}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₽{price}</Text>
          <Text style={styles.perNight}> / ночь</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 200 },
  imagePlaceholder: {
    backgroundColor: Colors.sand[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  instantBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.pine[500],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  instantText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  info: { padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: Colors.slate[900], flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 8 },
  rating: { fontSize: 12, fontWeight: '600', color: Colors.slate[700] },
  city: { fontSize: 13, color: Colors.slate[400], marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  price: { fontSize: 17, fontWeight: '700', color: Colors.slate[900] },
  perNight: { fontSize: 13, color: Colors.slate[400] },
});
