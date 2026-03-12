import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { fetchHostBookings, confirmBooking, declineBooking, type HostBooking } from '@/services/host';
import { Colors } from '@/constants/colors';

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Ожидает',    color: '#92400E', bg: '#FEF9C3' },
  CONFIRMED: { label: 'Подтверждено', color: '#166534', bg: '#DCFCE7' },
  CANCELLED: { label: 'Отменено',   color: '#991B1B', bg: '#FEE2E2' },
  COMPLETED: { label: 'Завершено',  color: Colors.slate[600], bg: Colors.slate[100] },
};

function getGuestName(booking: HostBooking): string {
  const p = booking.guest.profile;
  if (p?.firstName || p?.lastName) return [p.firstName, p.lastName].filter(Boolean).join(' ');
  return booking.guest.email.split('@')[0] ?? booking.guest.email;
}

function BookingCard({ item, onConfirm, onDecline }: {
  item: HostBooking;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const statusInfo = STATUS_LABEL[item.status] ?? STATUS_LABEL.PENDING;
  const thumb = item.listing.images.find((i) => i.isPrimary)?.url ?? item.listing.images[0]?.url;
  const price = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(
    Number(item.totalPrice),
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name="home-outline" size={24} color={Colors.slate[400]} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.listingTitle} numberOfLines={1}>{item.listing.title}</Text>
          <Text style={styles.guestName}>{getGuestName(item)}</Text>
          <Text style={styles.dates}>
            {format(new Date(item.checkIn), 'd MMM', { locale: ru })} —{' '}
            {format(new Date(item.checkOut), 'd MMM yyyy', { locale: ru })}
          </Text>
          <Text style={styles.guests}>{item.adults} взр.{item.children ? ` · ${item.children} дет.` : ''}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.price}>{price}</Text>
          <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.badgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>
      </View>

      {item.status === 'PENDING' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
            <Text style={styles.declineBtnText}>Отклонить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
            <Text style={styles.confirmBtnText}>Подтвердить</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function HostBookingsScreen() {
  const queryClient = useQueryClient();
  const [page] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['host-bookings', page],
    queryFn: () => fetchHostBookings(page, 20),
  });

  const confirmMutation = useMutation({
    mutationFn: confirmBooking,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['host-bookings'] }),
    onError: () => Alert.alert('Ошибка', 'Не удалось подтвердить бронирование'),
  });

  const declineMutation = useMutation({
    mutationFn: declineBooking,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['host-bookings'] }),
    onError: () => Alert.alert('Ошибка', 'Не удалось отклонить бронирование'),
  });

  const handleConfirm = (id: string) => {
    Alert.alert('Подтвердить бронирование?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Подтвердить', onPress: () => confirmMutation.mutate(id) },
    ]);
  };

  const handleDecline = (id: string) => {
    Alert.alert('Отклонить бронирование?', 'Гость будет уведомлён об отмене', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Отклонить', style: 'destructive', onPress: () => declineMutation.mutate(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.slate[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Бронирования</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.pine[500]} />
        </View>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard
              item={item}
              onConfirm={() => handleConfirm(item.id)}
              onDecline={() => handleDecline(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={64} color={Colors.slate[400]} />
              <Text style={styles.emptyTitle}>Нет бронирований</Text>
              <Text style={styles.emptySubtitle}>Здесь появятся заявки гостей</Text>
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
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', gap: 10 },
  thumb: { width: 60, height: 60, borderRadius: 10 },
  thumbFallback: { backgroundColor: Colors.sand[100], justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  listingTitle: { fontSize: 14, fontWeight: '600', color: Colors.slate[900] },
  guestName: { fontSize: 13, color: Colors.slate[600], marginTop: 2 },
  dates: { fontSize: 12, color: Colors.slate[500], marginTop: 2 },
  guests: { fontSize: 12, color: Colors.slate[400], marginTop: 1 },
  price: { fontSize: 15, fontWeight: '700', color: Colors.slate[900] },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  declineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.slate[400],
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  declineBtnText: { fontSize: 14, fontWeight: '600', color: Colors.slate[700] },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.pine[500],
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: Colors.white },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.slate[700] },
  emptySubtitle: { fontSize: 14, color: Colors.slate[500] },
});
