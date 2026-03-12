import { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getListingById } from '@/services/listings';
import { createBooking } from '@/services/bookings';
import { createPaymentIntent } from '@/services/payments';
import { Colors } from '@/constants/colors';

// Simple date range picker — displays two date presses opening native date pickers via Alert
// For production, replace with @react-native-community/datetimepicker or react-native-calendars

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function diffDays(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function fmt(d: Date): string {
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BookingScreen() {
  const { id: listingId } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [checkIn, setCheckIn] = useState<Date>(addDays(today, 1));
  const [checkOut, setCheckOut] = useState<Date>(addDays(today, 4));
  const [guests, setGuests] = useState(1);
  const [notes, setNotes] = useState('');

  const nights = diffDays(checkIn, checkOut);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => getListingById(listingId),
    enabled: !!listingId,
  });

  const bookMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: async (booking) => {
      void qc.invalidateQueries({ queryKey: ['my-bookings'] });

      // Try to get YooKassa payment URL and open WebView
      try {
        const intent = await createPaymentIntent(booking.id);
        if (intent.confirmationUrl) {
          const result = await WebBrowser.openAuthSessionAsync(
            intent.confirmationUrl,
            'milyidom://payment-result',
          );
          void qc.invalidateQueries({ queryKey: ['my-bookings'] });
          if (result.type === 'success') {
            Alert.alert('Оплата принята', 'Бронирование оплачено!', [
              { text: 'К поездкам', onPress: () => router.replace('/(tabs)/bookings') },
            ]);
            return;
          }
        }
      } catch {
        // Payment intent failed — still show booking success
      }

      Alert.alert(
        'Бронирование создано!',
        listing?.instantBook
          ? 'Ваше бронирование подтверждено автоматически.'
          : 'Ожидайте подтверждения от хозяина.',
        [{ text: 'К поездкам', onPress: () => router.replace('/(tabs)/bookings') }],
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Не удалось создать бронирование';
      Alert.alert('Ошибка', msg);
    },
  });

  const handleConfirm = () => {
    if (nights < 1) {
      Alert.alert('Ошибка', 'Дата выезда должна быть позже даты заезда');
      return;
    }
    if (!listing) return;

    Alert.alert(
      'Подтвердить бронирование',
      `${listing.title}\n${fmt(checkIn)} — ${fmt(checkOut)} · ${nights} ночей\n\nИтого: ₽${(parseFloat(listing.basePrice.toString()) * nights).toLocaleString('ru-RU')}`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Подтвердить',
          onPress: () =>
            bookMutation.mutate({
              listingId,
              checkIn: checkIn.toISOString(),
              checkOut: checkOut.toISOString(),
              adults: guests,
            }),
        },
      ],
    );
  };

  // Minimal date stepper helper (replaces a full calendar for brevity)
  const shiftDate = (
    which: 'checkIn' | 'checkOut',
    delta: number,
  ) => {
    if (which === 'checkIn') {
      const next = addDays(checkIn, delta);
      if (next < today) return;
      setCheckIn(next);
      if (next >= checkOut) setCheckOut(addDays(next, 1));
    } else {
      const next = addDays(checkOut, delta);
      if (next <= checkIn) return;
      setCheckOut(next);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.pine[500]} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Объявление не найдено</Text>
      </View>
    );
  }

  const pricePerNight = parseFloat(listing.basePrice.toString());
  const totalPrice = pricePerNight * nights;
  const serviceFee = Math.round(totalPrice * 0.12);
  const grandTotal = totalPrice + serviceFee;

  return (
    <>
      <Stack.Screen options={{ title: 'Бронирование', presentation: 'modal' }} />

      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Listing summary */}
          <View style={styles.card}>
            <Text style={styles.listingTitle} numberOfLines={2}>
              {listing.title}
            </Text>
            <Text style={styles.listingCity}>{listing.city}</Text>
          </View>

          {/* Dates */}
          <Text style={styles.sectionTitle}>Даты</Text>
          <View style={styles.datesRow}>
            {/* Check-in */}
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Заезд</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => shiftDate('checkIn', -1)} style={styles.stepBtn}>
                  <Ionicons name="remove" size={18} color={Colors.slate[700]} />
                </TouchableOpacity>
                <Text style={styles.dateValue}>{fmt(checkIn)}</Text>
                <TouchableOpacity onPress={() => shiftDate('checkIn', 1)} style={styles.stepBtn}>
                  <Ionicons name="add" size={18} color={Colors.slate[700]} />
                </TouchableOpacity>
              </View>
            </View>

            <Ionicons name="arrow-forward" size={16} color={Colors.slate[400]} style={{ marginTop: 20 }} />

            {/* Check-out */}
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Выезд</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => shiftDate('checkOut', -1)} style={styles.stepBtn}>
                  <Ionicons name="remove" size={18} color={Colors.slate[700]} />
                </TouchableOpacity>
                <Text style={styles.dateValue}>{fmt(checkOut)}</Text>
                <TouchableOpacity onPress={() => shiftDate('checkOut', 1)} style={styles.stepBtn}>
                  <Ionicons name="add" size={18} color={Colors.slate[700]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={styles.nightsLabel}>{nights} ночей</Text>

          {/* Guests */}
          <Text style={styles.sectionTitle}>Гости</Text>
          <View style={styles.guestRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setGuests((g) => Math.max(1, g - 1))}
            >
              <Ionicons name="remove" size={18} color={Colors.slate[700]} />
            </TouchableOpacity>
            <Text style={styles.guestCount}>{guests}</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() =>
                setGuests((g) =>
                  listing.guests ? Math.min(listing.guests, g + 1) : g + 1,
                )
              }
            >
              <Ionicons name="add" size={18} color={Colors.slate[700]} />
            </TouchableOpacity>
            <Text style={styles.guestLabel}>
              {listing.guests ? `макс. ${listing.guests}` : ''}
            </Text>
          </View>

          {/* Notes */}
          <Text style={styles.sectionTitle}>Сообщение хозяину (необязательно)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Расскажите о себе или задайте вопрос..."
            placeholderTextColor={Colors.slate[400]}
            multiline
            numberOfLines={3}
            maxLength={500}
          />

          {/* Price breakdown */}
          <View style={styles.priceCard}>
            <Text style={styles.sectionTitle}>Итого</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                ₽{pricePerNight.toLocaleString('ru-RU')} × {nights} ночей
              </Text>
              <Text style={styles.priceValue}>₽{totalPrice.toLocaleString('ru-RU')}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Сервисный сбор (12%)</Text>
              <Text style={styles.priceValue}>₽{serviceFee.toLocaleString('ru-RU')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.priceTotalLabel}>Итого</Text>
              <Text style={styles.priceTotalValue}>₽{grandTotal.toLocaleString('ru-RU')}</Text>
            </View>
          </View>

          {/* Instant book note */}
          {listing.instantBook ? (
            <View style={styles.instantNote}>
              <Ionicons name="flash" size={14} color={Colors.pine[500]} />
              <Text style={styles.instantNoteText}>
                Мгновенное бронирование — подтверждение автоматически
              </Text>
            </View>
          ) : (
            <View style={styles.instantNote}>
              <Ionicons name="time-outline" size={14} color={Colors.slate[500]} />
              <Text style={[styles.instantNoteText, { color: Colors.slate[500] }]}>
                Хозяин должен подтвердить бронирование (обычно в течение 24 ч)
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Confirm button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmBtn, (bookMutation.isPending || nights < 1) && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={bookMutation.isPending || nights < 1}
          >
            {bookMutation.isPending ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.confirmBtnText}>
                Подтвердить · ₽{grandTotal.toLocaleString('ru-RU')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.sand[50] },
  scroll: { padding: 20, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: Colors.slate[600] },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.sand[100],
  },
  listingTitle: { fontSize: 16, fontWeight: '700', color: Colors.slate[900] },
  listingCity: { fontSize: 13, color: Colors.slate[400], marginTop: 4 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.slate[900], marginBottom: 10, marginTop: 20 },

  datesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBox: { flex: 1 },
  dateLabel: { fontSize: 11, color: Colors.slate[400], fontWeight: '500', marginBottom: 4 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.sand[200],
    overflow: 'hidden',
  },
  stepBtn: {
    padding: 8,
    backgroundColor: Colors.sand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateValue: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: Colors.slate[700] },

  nightsLabel: { fontSize: 12, color: Colors.slate[400], marginTop: 6 },

  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  guestCount: { fontSize: 22, fontWeight: '700', color: Colors.slate[900], minWidth: 32, textAlign: 'center' },
  guestLabel: { fontSize: 13, color: Colors.slate[400] },

  notesInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.sand[200],
    padding: 14,
    fontSize: 14,
    color: Colors.slate[700],
    textAlignVertical: 'top',
    minHeight: 80,
  },

  priceCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.sand[100],
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: Colors.slate[600] },
  priceValue: { fontSize: 14, color: Colors.slate[900] },
  divider: { height: 1, backgroundColor: Colors.sand[100], marginVertical: 8 },
  priceTotalLabel: { fontSize: 15, fontWeight: '700', color: Colors.slate[900] },
  priceTotalValue: { fontSize: 15, fontWeight: '700', color: Colors.slate[900] },

  instantNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.pine[50],
    borderRadius: 10,
  },
  instantNoteText: { flex: 1, fontSize: 12, color: Colors.pine[700], lineHeight: 16 },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.sand[100],
    backgroundColor: Colors.white,
  },
  confirmBtn: {
    backgroundColor: Colors.pine[500],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
