import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Message, Sport } from '../api/types';
import { colors } from '../theme/colors';
import type { AppStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'Chat'>;
  route: RouteProp<AppStackParamList, 'Chat'>;
};

const SPORTS: Sport[] = ['tennis', 'squash', 'pickleball'];

export function ChatScreen({ navigation, route }: Props) {
  const { matchId } = route.params;
  const { apiToken, session } = useAuth();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const myId = session?.user?.id;

  const load = useCallback(async () => {
    const data = await api.getMessages(apiToken, matchId);
    setMessages(data);
    setLoading(false);
  }, [apiToken, matchId]);

  useEffect(() => {
    navigation.setOptions({ title: route.params.title });
  }, [navigation, route.params.title]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    await api.sendMessage(apiToken, matchId, body);
    await load();
  };

  const suggestGame = async () => {
    const sport = SPORTS[Math.floor(Math.random() * SPORTS.length)];
    const when = new Date();
    when.setDate(when.getDate() + 2);
    when.setHours(18, 0, 0, 0);
    await api.createProposal(apiToken, matchId, {
      sport,
      proposed_time: when.toISOString(),
      location: 'Open court — tap Messages to confirm',
    });
    await api.sendMessage(
      apiToken,
      matchId,
      `Suggested ${sport} — ${when.toLocaleString()} at our usual spot. Open the proposals list to accept.`
    );
    await load();
  };

  if (loading && messages.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <Pressable style={styles.suggestBtn} onPress={suggestGame}>
        <Text style={styles.suggestText}>Suggest a game</Text>
      </Pressable>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const mine = item.sender_id === myId;
          return (
            <View style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirsWrap]}>
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.bubbleText, mine && styles.mineText]}>{item.body}</Text>
              </View>
            </View>
          );
        }}
      />
      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message…"
          placeholderTextColor={colors.textSecondary}
          multiline
          textAlignVertical="top"
        />
        <Pressable
          style={[styles.send, !text.trim() && styles.sendOff]}
          onPress={send}
          disabled={!text.trim()}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  suggestBtn: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  suggestText: { color: colors.primary, fontWeight: '700' },
  list: { padding: 12, paddingBottom: 16 },
  bubbleWrap: { marginBottom: 8, flexDirection: 'row' },
  mineWrap: { justifyContent: 'flex-end' },
  theirsWrap: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  mine: { backgroundColor: colors.primary },
  theirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  bubbleText: { color: colors.text, fontSize: 16 },
  mineText: { color: colors.white },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    color: colors.text,
    minHeight: 40,
    maxHeight: 140,
  },
  send: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    minHeight: 40,
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.4 },
  sendText: { color: colors.white, fontWeight: '700' },
});
