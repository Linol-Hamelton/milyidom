import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { fetchConversations, type Conversation, type ConversationUser } from '@/services/messages';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/colors';

function getDisplayName(user: ConversationUser): string {
  const { profile } = user;
  if (profile?.firstName || profile?.lastName) {
    return [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  }
  return user.email.split('@')[0] ?? user.email;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Вчера';
  return format(date, 'd MMM', { locale: ru });
}

function ConversationItem({ item, currentUserId }: { item: Conversation; currentUserId: string }) {
  const isHost = item.hostId === currentUserId;
  const other = isHost ? item.guest : item.host;
  const lastMsg = item.messages[0];
  const unread = item.messages.filter(
    (m) => m.recipientId === currentUserId && !m.readAt,
  ).length;
  const avatarUri = other.profile?.avatarUrl;

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => router.push(`/conversation/${item.id}` as Parameters<typeof router.push>[0])}
      activeOpacity={0.75}
    >
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>
            {getDisplayName(other).charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {getDisplayName(other)}
          </Text>
          {lastMsg && (
            <Text style={styles.time}>{formatTimestamp(lastMsg.sentAt)}</Text>
          )}
        </View>
        <Text style={styles.listingTitle} numberOfLines={1}>
          {item.listing.title}
        </Text>
        {lastMsg && (
          <Text
            style={[styles.preview, unread > 0 && styles.previewUnread]}
            numberOfLines={1}
          >
            {lastMsg.senderId === currentUserId ? 'Вы: ' : ''}
            {lastMsg.body}
          </Text>
        )}
      </View>
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const { isAuthenticated, user } = useAuthStore();

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => fetchConversations(),
    enabled: isAuthenticated,
    refetchInterval: 15_000,
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Сообщения</Text>
        </View>
        <View style={styles.empty}>
          <Ionicons name="chatbubble-outline" size={64} color={Colors.slate[400]} />
          <Text style={styles.emptyTitle}>Войдите в аккаунт</Text>
          <Text style={styles.emptySubtitle}>
            Чтобы просматривать сообщения, войдите в профиль
          </Text>
          <TouchableOpacity
            style={styles.authBtn}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.authBtnText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Сообщения</Text>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.pine[500]} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem item={item} currentUserId={user?.id ?? ''} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-outline" size={64} color={Colors.slate[400]} />
              <Text style={styles.emptyTitle}>Нет сообщений</Text>
              <Text style={styles.emptySubtitle}>
                Здесь будут ваши переписки с хозяевами жилья
              </Text>
            </View>
          }
          contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={() => void refetch()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[200],
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.slate[900] },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.slate[700], textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: Colors.slate[500], textAlign: 'center', lineHeight: 20 },
  authBtn: {
    marginTop: 8,
    backgroundColor: Colors.pine[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  authBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: {
    backgroundColor: Colors.pine[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: Colors.pine[700] },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: Colors.slate[900], flex: 1 },
  time: { fontSize: 12, color: Colors.slate[400], marginLeft: 8 },
  listingTitle: { fontSize: 12, color: Colors.pine[600], marginTop: 1 },
  preview: { fontSize: 13, color: Colors.slate[500], marginTop: 2 },
  previewUnread: { color: Colors.slate[700], fontWeight: '500' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.slate[100], marginLeft: 78 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.pine[500],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.white },
});
