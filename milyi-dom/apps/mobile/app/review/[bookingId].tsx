import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { createReview } from '@/services/reviews';
import { Colors } from '@/constants/colors';

const RATING_FIELDS = [
  { key: 'cleanliness' as const, label: 'Чистота' },
  { key: 'communication' as const, label: 'Общение с хозяином' },
  { key: 'checkIn' as const, label: 'Заселение' },
  { key: 'accuracy' as const, label: 'Точность описания' },
  { key: 'location' as const, label: 'Расположение' },
  { key: 'value' as const, label: 'Цена/качество' },
] as const;

type RatingKey = (typeof RATING_FIELDS)[number]['key'];

type Ratings = Record<RatingKey, number>;

function StarPicker({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <View style={styles.starRow}>
      <Text style={styles.starLabel}>{label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onChange(star)} hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Ionicons
              name={star <= value ? 'star' : 'star-outline'}
              size={28}
              color={star <= value ? Colors.amber[400] : Colors.slate[300]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function ReviewFormScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [overallRating, setOverallRating] = useState(5);
  const [comment, setComment] = useState('');
  const [ratings, setRatings] = useState<Ratings>({
    cleanliness: 5,
    communication: 5,
    checkIn: 5,
    accuracy: 5,
    location: 5,
    value: 5,
  });

  const mutation = useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      Alert.alert('Спасибо!', 'Ваш отзыв опубликован.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('Ошибка', 'Не удалось отправить отзыв. Попробуйте ещё раз.');
    },
  });

  const handleSubmit = () => {
    if (!comment.trim()) {
      Alert.alert('Добавьте комментарий', 'Пожалуйста, напишите несколько слов о вашем пребывании.');
      return;
    }
    mutation.mutate({
      bookingId,
      rating: overallRating,
      comment: comment.trim(),
      ...ratings,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.slate[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Оставить отзыв</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Общая оценка</Text>
        <View style={styles.overallRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setOverallRating(star)}>
              <Ionicons
                name={star <= overallRating ? 'star' : 'star-outline'}
                size={40}
                color={star <= overallRating ? Colors.amber[400] : Colors.slate[300]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Подробные оценки</Text>
        <View style={styles.card}>
          {RATING_FIELDS.map((field) => (
            <StarPicker
              key={field.key}
              label={field.label}
              value={ratings[field.key]}
              onChange={(v) => setRatings((prev) => ({ ...prev, [field.key]: v }))}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Комментарий</Text>
        <TextInput
          style={styles.textarea}
          value={comment}
          onChangeText={setComment}
          placeholder="Расскажите о своём пребывании..."
          placeholderTextColor={Colors.slate[400]}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={2000}
        />
        <Text style={styles.charCount}>{comment.length}/2000</Text>

        <TouchableOpacity
          style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitBtnText}>Опубликовать отзыв</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  body: { flex: 1, padding: 16 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.slate[800],
    marginTop: 20,
    marginBottom: 10,
  },
  overallRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starLabel: { fontSize: 14, color: Colors.slate[700], flex: 1 },
  stars: { flexDirection: 'row', gap: 4 },
  textarea: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.slate[800],
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    lineHeight: 20,
  },
  charCount: { fontSize: 11, color: Colors.slate[400], textAlign: 'right', marginTop: 4 },
  submitBtn: {
    backgroundColor: Colors.pine[500],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
