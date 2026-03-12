import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '@/services/notifications-api';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/colors';

const NOTIFICATION_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  BOOKING_CONFIRMED: 'checkmark-circle',
  BOOKING_CANCELLED: 'close-circle',
  BOOKING_REQUEST: 'calendar',
  REVIEW_RECEIVED: 'star',
  MESSAGE_RECEIVED: 'chatbubble',
  PAYMENT_RECEIVED: 'card',
};

function NotificationItem({
  item,
  onRead,
}: {
  item: AppNotification;
  onRead: () => void;
}) {
  const icon = NOTIFICATION_ICON[item.type] ?? 'notifications';
  const isUnread = !item.readAt;

  return (
    <TouchableOpacity
      style={[styles.item, isUnread && styles.itemUnread]}
      onPress={onRead}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrap, isUnread && styles.iconWrapUnread]}>
        <Ionicons name={icon} size={20} color={isUnread ? Colors.pine[600] : Colors.slate[400]} />
      </View>
      <View style={styles.itemBody}>
        <Text style={[styles.itemTitle, isUnread && styles.itemTitleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemText} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.itemTime}>
          {format(new Date(item.createdAt), 'd MMM, HH:mm', { locale: ru })}
        </Text>
      </View>
      {isUnread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: isAuthenticated,
  });

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Ionicons name="notifications-outline" size={64} color={Colors.slate[400]} />
          <Text style={styles.emptyTitle}>Войдите, чтобы видеть уведомления</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginBtnText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="arrow-back" size={24} color={Colors.slate[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Уведомления</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => readAllMutation.mutate()} disabled={readAllMutation.isPending}>
            <Text style={styles.readAllText}>Прочитать все</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.pine[500]} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onRead={() => !item.readAt && readMutation.mutate(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={56} color={Colors.slate[300]} />
              <Text style={styles.emptyTitle}>Уведомлений пока нет</Text>
            </View>
          }
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.slate[900] },
  badge: {
    backgroundColor: Colors.rose[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  readAllText: { fontSize: 13, color: Colors.pine[600], fontWeight: '600' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.slate[600], textAlign: 'center' },
  loginBtn: {
    backgroundColor: Colors.pine[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  loginBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.white,
  },
  itemUnread: { backgroundColor: Colors.pine[50] },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.slate[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapUnread: { backgroundColor: Colors.pine[100] },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '500', color: Colors.slate[700] },
  itemTitleUnread: { fontWeight: '700', color: Colors.slate[900] },
  itemText: { fontSize: 13, color: Colors.slate[500], marginTop: 2, lineHeight: 18 },
  itemTime: { fontSize: 11, color: Colors.slate[400], marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.pine[500],
    marginTop: 6,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.slate[200] },
});
