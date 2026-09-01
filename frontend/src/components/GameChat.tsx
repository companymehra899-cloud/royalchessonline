import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const POLL_INTERVAL_MS = 3000;

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
}

interface GameChatProps {
  roomCode: string;
  userId?: string;
  token?: string | null;
}

export const GameChat: React.FC<GameChatProps> = ({ roomCode, userId, token }) => {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const visibleRef = useRef(visible);
  const lastSeenCountRef = useRef(0);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const fetchMessages = useCallback(async () => {
    if (!roomCode) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/online/rooms/${roomCode}/chat`);
      if (!res.ok) return;
      const data: ChatMessage[] = await res.json();
      if (!Array.isArray(data)) return;

      setMessages(data);

      // Track unread messages (only opponent's) when chat is closed
      if (!visibleRef.current) {
        const opponentCount = data.filter((m) => m.sender_id !== userId).length;
        const newUnread = opponentCount - lastSeenCountRef.current;
        if (newUnread > 0) setUnreadCount(newUnread);
      } else {
        lastSeenCountRef.current = data.filter((m) => m.sender_id !== userId).length;
        setUnreadCount(0);
      }
    } catch {
      // Silent fail — polling will retry
    }
  }, [roomCode, userId]);

  // Poll for new messages on an interval while mounted (online match only)
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const openChat = () => {
    setVisible(true);
    setUnreadCount(0);
    lastSeenCountRef.current = messages.filter((m) => m.sender_id !== userId).length;
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 150);
  };

  const closeChat = () => {
    setVisible(false);
    lastSeenCountRef.current = messages.filter((m) => m.sender_id !== userId).length;
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/online/rooms/${roomCode}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        await fetchMessages();
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        setDraft(text); // restore on failure
      }
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMine = item.sender_id === userId;
    return (
      <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {!isMine && <Text style={styles.senderName}>{item.sender_name}</Text>}
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.text}</Text>
          <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.fab}
        testID="game-chat-button"
        onPress={openChat}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="chat-outline" size={24} color="#0b0e14" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={closeChat}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.kav}
          >
            <View style={styles.sheet}>
              {/* Grabber handle */}
              <View style={styles.grabberWrap}>
                <View style={styles.grabber} />
              </View>

              {/* Header */}
              <View style={styles.sheetHeader}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconWrap}>
                    <MaterialCommunityIcons name="message-text-outline" size={18} color={colors.gold} />
                  </View>
                  <Text style={styles.headerTitle}>Match Chat</Text>
                </View>
                <TouchableOpacity onPress={closeChat} style={styles.closeBtn} testID="game-chat-close">
                  <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              {messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="chat-processing-outline" size={40} color={colors.textTertiary} />
                  <Text style={styles.emptyText}>Say hello to your opponent!</Text>
                </View>
              ) : (
                <FlatList
                  ref={listRef}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  contentContainerStyle={styles.listContent}
                  onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                  showsVerticalScrollIndicator={false}
                />
              )}

              {/* Input Row */}
              <View style={styles.inputRow}>
                <View style={styles.inputPill}>
                  <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.textTertiary}
                    value={draft}
                    onChangeText={setDraft}
                    maxLength={500}
                    multiline
                    testID="game-chat-input"
                    onSubmitEditing={sendMessage}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
                    onPress={sendMessage}
                    disabled={!draft.trim() || sending}
                    testID="game-chat-send"
                  >
                    {sending ? (
                      <ActivityIndicator color="#0b0e14" size="small" />
                    ) : (
                      <MaterialCommunityIcons name="send" size={18} color="#0b0e14" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 90,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  kav: {
    width: '100%',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    height: '70%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  grabberWrap: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gold,
    opacity: 0.85,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 10,
  },
  listContent: {
    padding: 12,
    paddingBottom: 6,
  },
  bubbleRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine: {
    backgroundColor: colors.gold,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.surfaceElevated,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  bubbleText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 19,
  },
  bubbleTextMine: {
    color: '#0b0e14',
    fontWeight: '600',
  },
  bubbleTime: {
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: 'rgba(11,14,20,0.6)',
  },
  inputRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#0e1119',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 9,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});
