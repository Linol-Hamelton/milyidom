import { useState, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { searchListings } from '@/services/listings';
import { ListingCard } from '@/components/ListingCard';
import { Colors } from '@/constants/colors';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['listings-search', submitted],
    queryFn: () => searchListings({ q: submitted, limit: 20 }),
    enabled: true,
  });

  const handleSearch = useCallback(() => {
    setSubmitted(query.trim());
  }, [query]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color={Colors.slate[400]} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Город, название, тип..."
            placeholderTextColor={Colors.slate[400]}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSubmitted(''); }}>
              <Ionicons name="close-circle" size={18} color={Colors.slate[400]} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Найти</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.pine[500]} />
        </View>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListingCard item={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            data && (
              <Text style={styles.resultsCount}>
                {data.meta.total} результатов
              </Text>
            )
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={Colors.slate[400]} />
              <Text style={styles.emptyText}>
                {submitted ? 'Ничего не найдено' : 'Введите запрос для поиска'}
              </Text>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sand[100],
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sand[50],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.sand[200],
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: Colors.slate[900] },
  searchBtn: {
    backgroundColor: Colors.pine[500],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBtnText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  list: { padding: 16 },
  resultsCount: { fontSize: 13, color: Colors.slate[500], marginBottom: 12 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: Colors.slate[500], fontSize: 15, textAlign: 'center' },
});
