import { useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { getFeaturedListings } from '@/services/listings';
import { ListingCard } from '@/components/ListingCard';
import { Colors } from '@/constants/colors';

export default function HomeScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['featured-listings'],
    queryFn: getFeaturedListings,
  });

  const onRefresh = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Милый Дом</Text>
        <Text style={styles.tagline}>Найди идеальное жильё</Text>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.pine[500]} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListingCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={Colors.pine[500]}
            />
          }
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>Рекомендуемые объекты</Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Пока нет объявлений</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand[50] },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sand[100],
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.pine[500],
    letterSpacing: -0.5,
  },
  tagline: { fontSize: 13, color: Colors.slate[500], marginTop: 2 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.slate[900],
    marginBottom: 12,
    marginTop: 4,
  },
  list: { padding: 16 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: Colors.slate[500], fontSize: 15 },
});
