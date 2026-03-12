import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import * as SecureStore from 'expo-secure-store';
import { io, Socket } from 'socket.io-client';
import {
  fetchConversation,
  sendMessage,
  type Message,
  type ConversationUser,
} from '@/services/messages';
import { useAuthStore } from '@/stores/auth.store';
import { Colors } from '@/constants/colors';

const WS_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4001';

function getDisplayName(user: ConversationUser): string {
  const { profile } = user;
  if (profile?.firstName || profile?.lastName) {
    return [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  }
  return user.email.split('@')[0] ?? user.email;
}

function MessageBubble({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  return (
    <View style={[styles.bubbleWrapper, isOwn ? styles.bubbleWrapperOwn : styles.bubbleWrapperOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
          {msg.body}
        </Text>
      </View>
      <Text style={[styles.msgTime, isOwn ? styles.msgTimeOwn : styles.msgTimeOther]}>
        {format(new Date(msg.sentAt), 'HH:mm')}
        {isOwn && (
          <Text style={styles.readStatus}>{msg.readAt ? '  ✓✓' : '  ✓'}</Text>
        )}
      </Text>
    </View>
  );
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList<Message>>(null);
  const socketRef = useRef<Socket | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => fetchConversation(id!),
    enabled: !!id,
  });

  // Sync messages when query loads
  useEffect(() => {
    if (conversation?.messages) {
      setMessages(conversation.messages);
    }
  }, [conversation?.messages]);

  // WebSocket setup
  useEffect(() => {
    if (!id || !user) return;

    let socket: Socket;

    const connect = async () => {
      const token = await SecureStore.getItemAsync('access_token');
      socket = io(WS_URL, {
        transports: ['websocket'],
        auth: { token },
        reconnection: true,
        reconnectionDelay: 2000,
      });

      socket.on('connect', () => {
        socket.emit('join_conversation', { conversationId: id });
      });

      socket.on('message', (msg: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // invalidate conversations list to update preview
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      });

      socket.on('connect_error', () => {
        // silently reconnect — polling fallback still works
      });

      socketRef.current = socket;
    };

    void connect();

    return () => {
      socket?.emit('leave_conversation', { conversationId: id });
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [id, user, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const body = text.trim();
    if (!body || !id || sending) return;

    setSending(true);
    setText('');

    // Optimistic message
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversationId: id,
      senderId: user?.id ?? '',
      recipientId: '',
      body,
      sentAt: new Date().toISOString(),
      readAt: null,
      sender: { id: user?.id ?? '', email: '' },
      recipient: { id: '', email: '' },
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const sent = await sendMessage(id, body);
      // Replace optimistic with real message
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? sent : m)));
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch {
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      Alert.alert('Ошибка', 'Не удалось отправить сообщение. Попробуйте снова.');
      setText(body);
    } finally {
      setSending(false);
    }
  }, [text, id, sending, user, queryClient]);

  const otherUser = conversation
    ? conversation.hostId === user?.id
      ? conversation.guest
      : conversation.host
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.slate[700]} />
        </TouchableOpacity>
        {otherUser && (
          <View style={styles.headerUser}>
            {otherUser.profile?.avatarUrl ? (
              <Image source={{ uri: otherUser.profile.avatarUrl }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
                <Text style={styles.headerAvatarInitial}>
                  {getDisplayName(otherUser).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.headerName}>{getDisplayName(otherUser)}</Text>
              {conversation?.listing && (
                <Text style={styles.headerListing} numberOfLines={1}>
                  {conversation.listing.title}
                </Text>
              )}
            </View>
          </View>
        )}
        <View style={{ width: 24 }} />
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.pine[500]} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble msg={item} isOwn={item.senderId === user?.id} />
            )}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyText}>Начните переписку</Text>
              </View>
            }
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          {/* Input */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Написать сообщение..."
              placeholderTextColor={Colors.slate[400]}
              multiline
              maxLength={5000}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={() => void handleSend()}
              disabled={!text.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="send" size={18} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.sand[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate[200],
  },
  headerUser: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginHorizontal: 8 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarFallback: {
    backgroundColor: Colors.pine[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarInitial: { fontSize: 14, fontWeight: '700', color: Colors.pine[700] },
  headerName: { fontSize: 15, fontWeight: '600', color: Colors.slate[900] },
  headerListing: { fontSize: 11, color: Colors.slate[500], maxWidth: 180 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { paddingHorizontal: 16, paddingVertical: 12, gap: 4 },
  emptyMessages: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 14, color: Colors.slate[400] },
  bubbleWrapper: { marginVertical: 2 },
  bubbleWrapperOwn: { alignItems: 'flex-end' },
  bubbleWrapperOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleOwn: {
    backgroundColor: Colors.pine[500],
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextOwn: { color: Colors.white },
  bubbleTextOther: { color: Colors.slate[900] },
  msgTime: { fontSize: 11, marginTop: 2, marginHorizontal: 4 },
  msgTimeOwn: { color: Colors.slate[400], textAlign: 'right' },
  msgTimeOther: { color: Colors.slate[400] },
  readStatus: { color: Colors.pine[300] },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate[200],
  },
  input: {
    flex: 1,
    backgroundColor: Colors.sand[50],
    borderWidth: 1,
    borderColor: Colors.slate[200],
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.slate[900],
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.pine[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.slate[400] },
});
