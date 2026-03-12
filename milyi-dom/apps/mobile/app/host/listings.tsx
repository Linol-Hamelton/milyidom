import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Colors } from '@/constants/colors';

interface HostListing {
  id: string;
  title: string;
  city: string;
  country: string;
  status: 'DRAFT' | 'PUBLISHED' | 'UNLISTED';
  pricePerNight: string;
  currency: string;
  rating?: number;
  reviewCount?: number;
  images: Array<{ url: string; isPrimary: boolean }>;
}

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  PUBLISHED: { label: 'Опубликовано', color: '#166534', bg: '#DCFCE7' },
  DRAFT:     { label: 'Черновик',    color: '#92400E', bg: '#FEF9C3' },
  UNLISTED:  { label: 'Скрыто',      color: Colors.slate[600], bg: Colors.slate[100] },
};

async function fetchHostListings(): Promise<HostListing[]> {
  const { data } = await apiClient.get<HostListing[]>('/listings/host/me');
  return data;
}

function ListingCard({ item }: { item: HostListing }) {
  const thumb = item.images.find((i) => i.isPrimary)?.url ?? item.images[0]?.url;
  const statusInfo = STATUS_INFO[item.status] ?? STATUS_INFO.DRAFT;
  const price = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(
    Number(item.pricePerNight),
  );

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/listing/${item.id}` as Parameters<typeof router.push>[0])}
      activeOpacity={0.8}
    >
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="home-outline" size={32} color={Colors.slate[400]} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.location}>{item.city}, {item.country}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.price}>{price} / ночь</Text>
          {item.rating !== undefined && item.rating > 0 && (
            <View style={styles.rating}>
              <Ionicons name="star" size={12} color={Colors.pine[500]} />
              <Text style={styles.ratingText}>{Number(item.rating).toFixed(1)}</Text>
            </View>
          )}
        </View>
        <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.badgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HostListingsScreen() {
  const { data: listings = [], isLoading, refetch } = useQuery({
    queryKey: ['host-listings'],
    queryFn: fetchHostListings,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.slate[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Мои объявления</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.pine[500]} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListingCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="home-outline" size={64} color={Colors.slate[400]} />
              <Text style={styles.emptyTitle}>Нет объявлений</Text>
              <Text style={styles.emptySubtitle}>
                Создайте объявление на сайте, чтобы начать принимать гостей
              </Text>
            </View>
          }
          refreshing={isLoading}
          onRefresh={() => void refetch()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[200],
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.slate[900] },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12, gap: 12 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    flexDirection: 'row',
  },
  thumb: { width: 100, height: 110 },
  thumbFallback: { backgroundColor: Colors.sand[100], justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, padding: 12, gap: 4 },
  title: { fontSize: 14, fontWeight: '600', color: Colors.slate[900] },
  location: { fontSize: 12, color: Colors.slate[500] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  price: { fontSize: 13, fontWeight: '600', color: Colors.slate[700] },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, color: Colors.slate[700] },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.slate[700] },
  emptySubtitle: { fontSize: 14, color: Colors.slate[500], textAlign: 'center', lineHeight: 20 },
});
