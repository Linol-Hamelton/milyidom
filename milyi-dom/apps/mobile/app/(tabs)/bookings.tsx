import { useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { fetchMyBookings, cancelBooking, type Booking } from '@/services/bookings';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/colors';

const STATUS_CONFIG = {
  PENDING:   { label: 'Ожидает',   color: Colors.amber[600],  bg: '#FEF3C7' },
  CONFIRMED: { label: 'Подтверждён', color: Colors.pine[600], bg: Colors.pine[50] },
  CANCELLED: { label: 'Отменён',   color: Colors.slate[500],  bg: Colors.slate[100] },
  COMPLETED: { label: 'Завершён',  color: '#7C3AED',          bg: '#EDE9FE' },
} as const;

function BookingCard({ booking, onCancel }: { booking: Booking; onCancel: () => void }) {
  const cfg = STATUS_CONFIG[booking.status];
  const primaryImage = booking.listing.images.find((i) => i.isPrimary)?.url;
  const nights = Math.round(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.listingTitle} numberOfLines={1}>
            {booking.listing.title}
          </Text>
          <Text style={styles.listingCity}>{booking.listing.city}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.dates}>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Заезд</Text>
          <Text style={styles.dateValue}>
            {format(new Date(booking.checkIn), 'd MMM yyyy', { locale: ru })}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={Colors.slate[400]} />
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Выезд</Text>
          <Text style={styles.dateValue}>
            {format(new Date(booking.checkOut), 'd MMM yyyy', { locale: ru })}
          </Text>
        </View>
        <View style={[styles.dateItem, { alignItems: 'flex-end' }]}>
          <Text style={styles.dateLabel}>{nights} ночей</Text>
          <Text style={styles.priceValue}>
            {Number(booking.totalPrice).toLocaleString('ru-RU')} {booking.currency}
          </Text>
        </View>
      </View>

      {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Отменить бронирование</Text>
        </TouchableOpacity>
      )}
      {booking.status === 'COMPLETED' && (
        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() => router.push(`/review/${booking.id}`)}
        >
          <Ionicons name="star-outline" size={16} color={Colors.pine[600]} />
          <Text style={styles.reviewText}>Оставить отзыв</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function BookingsScreen() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: fetchMyBookings,
    enabled: isAuthenticated,
  });

  const { mutate: doCancel } = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
  });

  const handleCancel = useCallback((id: string) => {
    Alert.alert('Отмена бронирования', 'Вы уверены, что хотите отменить бронирование?', [
      { text: 'Нет', style: 'cancel' },
      { text: 'Да, отменить', style: 'destructive', onPress: () => doCancel(id) },
    ]);
  }, [doCancel]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <Ionicons name="calendar-outline" size={56} color={Colors.pine[300]} />
          <Text style={styles.authTitle}>Войдите для просмотра поездок</Text>
          <TouchableOpacity
            style={styles.authBtn}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.authBtnText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Мои поездки</Text>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.pine[500]} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard booking={item} onCancel={() => handleCancel(item.id)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={Colors.pine[500]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={Colors.slate[400]} />
              <Text style={styles.emptyText}>У вас пока нет бронирований</Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push('/(tabs)/')}
              >
                <Text style={styles.exploreBtnText}>Найти жильё</Text>
              </TouchableOpacity>
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
  headerBar: {
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sand[100],
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.slate[900] },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  listingTitle: { fontSize: 16, fontWeight: '600', color: Colors.slate[900], flex: 1 },
  listingCity: { fontSize: 13, color: Colors.slate[500], marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  dates: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateItem: { flex: 1 },
  dateLabel: { fontSize: 11, color: Colors.slate[400], textTransform: 'uppercase' },
  dateValue: { fontSize: 13, fontWeight: '500', color: Colors.slate[700], marginTop: 2 },
  priceValue: { fontSize: 14, fontWeight: '700', color: Colors.pine[500], marginTop: 2 },
  cancelBtn: { marginTop: 14, paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: Colors.rose[500], fontSize: 14, fontWeight: '500' },
  reviewBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.pine[300],
  },
  reviewText: { color: Colors.pine[600], fontSize: 14, fontWeight: '600' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: Colors.slate[500], fontSize: 15 },
  exploreBtn: {
    marginTop: 8,
    backgroundColor: Colors.pine[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreBtnText: { color: Colors.white, fontWeight: '600' },
  authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  authTitle: { fontSize: 18, fontWeight: '600', color: Colors.slate[700] },
  authBtn: {
    backgroundColor: Colors.pine[500],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  authBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
