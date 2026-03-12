import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { fetchSavedSearches, deleteSavedSearch, type SavedSearch } from '@/services/saved-searches';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/colors';

function buildSearchLabel(filters: Record<string, unknown>): string {
  const parts: string[] = [];
  if (filters.city) parts.push(String(filters.city));
  if (filters.propertyType) parts.push(String(filters.propertyType));
  if (filters.minPrice || filters.maxPrice) {
    const min = filters.minPrice ? `от ${Number(filters.minPrice).toLocaleString('ru-RU')}₽` : '';
    const max = filters.maxPrice ? `до ${Number(filters.maxPrice).toLocaleString('ru-RU')}₽` : '';
    parts.push([min, max].filter(Boolean).join(' '));
  }
  if (filters.guests) parts.push(`${filters.guests} гостей`);
  return parts.join(' · ') || 'Все объявления';
}

function SearchItem({ item, onDelete, onApply }: {
  item: SavedSearch;
  onDelete: () => void;
  onApply: () => void;
}) {
  const handleDelete = () => {
    Alert.alert('Удалить поиск?', item.name || buildSearchLabel(item.filters), [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <TouchableOpacity style={styles.item} onPress={onApply} activeOpacity={0.8}>
      <View style={styles.itemIcon}>
        <Ionicons name="search" size={20} color={Colors.pine[600]} />
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name || buildSearchLabel(item.filters)}
        </Text>
        <Text style={styles.itemMeta} numberOfLines={1}>
          {buildSearchLabel(item.filters)}
        </Text>
        <Text style={styles.itemDate}>
          {format(new Date(item.createdAt), 'd MMM yyyy', { locale: ru })}
        </Text>
      </View>
      <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Ionicons name="trash-outline" size={20} color={Colors.slate[400]} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SavedSearchesScreen() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: searches = [], isLoading, refetch } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: fetchSavedSearches,
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });

  const handleApply = (item: SavedSearch) => {
    const params = new URLSearchParams();
    Object.entries(item.filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v));
    });
    router.push(`/(tabs)/search?${params.toString()}` as Parameters<typeof router.push>[0]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.slate[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Сохранённые поиски</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.pine[500]} />
        </View>
      ) : (
        <FlatList
          data={searches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SearchItem
              item={item}
              onDelete={() => deleteMutation.mutate(item.id)}
              onApply={() => handleApply(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bookmark-outline" size={64} color={Colors.slate[300]} />
              <Text style={styles.emptyTitle}>Нет сохранённых поисков</Text>
              <Text style={styles.emptySubtitle}>
                Сохраняйте фильтры поиска, чтобы быстро к ним возвращаться
              </Text>
              <TouchableOpacity style={styles.searchBtn} onPress={() => router.push('/(tabs)/search')}>
                <Text style={styles.searchBtnText}>Перейти к поиску</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={searches.length === 0 ? styles.emptyContainer : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[200],
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.slate[900] },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingVertical: 8 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.slate[700], textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: Colors.slate[500], textAlign: 'center', lineHeight: 20 },
  searchBtn: {
    marginTop: 8,
    backgroundColor: Colors.pine[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  searchBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.white,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.pine[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemBody: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.slate[900] },
  itemMeta: { fontSize: 12, color: Colors.slate[500], marginTop: 2 },
  itemDate: { fontSize: 11, color: Colors.slate[400], marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.slate[200] },
});
