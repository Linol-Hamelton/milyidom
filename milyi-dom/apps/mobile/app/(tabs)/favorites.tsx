import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { fetchFavorites, removeFromFavorites, type Favorite } from '@/services/favorites';
import { Colors } from '@/constants/colors';

function EmptyFavorites() {
  return (
    <View style={styles.empty}>
      <Ionicons name="heart-outline" size={64} color={Colors.slate[400]} />
      <Text style={styles.emptyTitle}>Нет сохранённых объявлений</Text>
      <Text style={styles.emptySubtitle}>
        Нажмите на сердечко на объявлении, чтобы добавить его в избранное
      </Text>
      <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(tabs)')}>
        <Text style={styles.exploreBtnText}>Исследовать</Text>
      </TouchableOpacity>
    </View>
  );
}

function FavoriteCard({ item, onRemove }: { item: Favorite; onRemove: () => void }) {
  const primaryImage = item.listing.images.find((i) => i.isPrimary)?.url ?? item.listing.images[0]?.url;

  const handleRemove = () => {
    Alert.alert('Удалить из избранного?', item.listing.title, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: onRemove },
    ]);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/listing/${item.listingId}`)}
      activeOpacity={0.85}
    >
      {primaryImage ? (
        <Image source={{ uri: primaryImage }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImage, styles.imagePlaceholder]}>
          <Ionicons name="home-outline" size={32} color={Colors.slate[400]} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.listing.title}
            </Text>
            <Text style={styles.cardCity}>
              {item.listing.city}, {item.listing.country}
            </Text>
          </View>
          <TouchableOpacity onPress={handleRemove} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="heart" size={22} color={Colors.rose[500]} />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardPrice}>
          {Number(item.listing.basePrice).toLocaleString('ru-RU', {
            style: 'currency',
            currency: item.listing.currency,
            maximumFractionDigits: 0,
          })}
          <Text style={styles.cardPriceUnit}> /ночь</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function FavoritesScreen() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading, refetch } = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites,
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: removeFromFavorites,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={64} color={Colors.slate[400]} />
          <Text style={styles.emptyTitle}>Войдите, чтобы увидеть избранное</Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.exploreBtnText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Избранное</Text>
        {favorites.length > 0 && (
          <Text style={styles.headerCount}>{favorites.length} объявлений</Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.pine[500]} />
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FavoriteCard
              item={item}
              onRemove={() => removeMutation.mutate(item.listingId)}
            />
          )}
          ListEmptyComponent={<EmptyFavorites />}
          contentContainerStyle={favorites.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={() => refetch()}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[200],
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.slate[900] },
  headerCount: { fontSize: 13, color: Colors.slate[500] },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.slate[700],
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.slate[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  exploreBtn: {
    marginTop: 8,
    backgroundColor: Colors.pine[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: { width: '100%', height: 180 },
  imagePlaceholder: {
    backgroundColor: Colors.slate[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.slate[900] },
  cardCity: { fontSize: 13, color: Colors.slate[500], marginTop: 2 },
  cardPrice: { fontSize: 15, fontWeight: '700', color: Colors.pine[600], marginTop: 8 },
  cardPriceUnit: { fontSize: 13, fontWeight: '400', color: Colors.slate[500] },
});
