import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Comment, FeedPost } from '../api/types';
import { colors, sportAccent } from '../theme/colors';
import { buttonStyles } from '../theme/buttons';

function formatTimeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} ${min === 1 ? 'minute' : 'minutes'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ${hr === 1 ? 'hour' : 'hours'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ${day === 1 ? 'day' : 'days'} ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} ${week === 1 ? 'week' : 'weeks'} ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} ${month === 1 ? 'month' : 'months'} ago`;
  const year = Math.floor(day / 365);
  return `${year} ${year === 1 ? 'year' : 'years'} ago`;
}

export function FeedScreen() {
  const { apiToken, session } = useAuth();
  const navigation = useNavigation();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const data = await api.getFeed(apiToken);
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }, [apiToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const fetchComments = useCallback(
    async (postId: string) => {
      setCommentsLoading((m) => ({ ...m, [postId]: true }));
      try {
        const data = await api.getComments(apiToken, postId);
        setCommentsByPost((m) => ({ ...m, [postId]: data }));
      } catch (e) {
        console.warn(e);
      } finally {
        setCommentsLoading((m) => ({ ...m, [postId]: false }));
      }
    },
    [apiToken]
  );

  const toggleComments = (postId: string) => {
    const open = !openComments[postId];
    setOpenComments((m) => ({ ...m, [postId]: open }));
    if (open && !commentsByPost[postId]) {
      fetchComments(postId);
    }
  };

  const toggleLike = async (p: FeedPost) => {
    setPosts((curr) =>
      curr.map((x) =>
        x.id === p.id
          ? {
              ...x,
              liked_by_me: !x.liked_by_me,
              like_count: x.like_count + (x.liked_by_me ? -1 : 1),
            }
          : x
      )
    );
    try {
      if (p.liked_by_me) {
        await api.unlikePost(apiToken, p.id);
      } else {
        await api.likePost(apiToken, p.id);
      }
    } catch (e) {
      console.warn(e);
      load();
    }
  };

  const submitComment = async (postId: string) => {
    const body = (commentDrafts[postId] ?? '').trim();
    if (!body) return;
    setCommentDrafts((d) => ({ ...d, [postId]: '' }));
    try {
      const created = await api.addComment(apiToken, postId, body);
      setCommentsByPost((m) => ({
        ...m,
        [postId]: [...(m[postId] ?? []), created],
      }));
      setOpenComments((m) => ({ ...m, [postId]: true }));
      setPosts((curr) =>
        curr.map((x) =>
          x.id === postId ? { ...x, comment_count: x.comment_count + 1 } : x
        )
      );
    } catch (e) {
      console.warn(e);
      setCommentDrafts((d) => ({ ...d, [postId]: body }));
    }
  };

  const followAuthor = async (userId: string) => {
    try {
      await api.follow(apiToken, userId);
      await load();
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          onPress={() => navigation.getParent()?.navigate('CreatePost')}
          hitSlop={8}
          accessibilityLabel="Log a session"
        >
          <Feather name="plus" size={34} color={colors.text} />
        </Pressable>
      </View>
      {loading && posts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.empty}>No posts yet. Log your first session.</Text>}
        renderItem={({ item: p }) => {
          const accent = sportAccent(p.sport);
          const isSelf = p.user_id === session?.user?.id;
          const isOpen = !!openComments[p.id];
          const comments = commentsByPost[p.id] ?? [];
          return (
            <View style={styles.card}>
              <View style={[styles.accentStripe, { backgroundColor: accent.secondary }]} />
              <View style={styles.cardHeader}>
                <Image
                  source={{
                    uri: p.author?.photo_url ?? 'https://picsum.photos/seed/f/48/48',
                  }}
                  style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.author}>{p.author?.name ?? 'Player'}</Text>
                  <Text style={styles.meta}>
                    {p.sport}
                    {p.location ? ` · ${p.location}` : ''}
                  </Text>
                </View>
                {!isSelf ? (
                  <Pressable style={styles.followPill} onPress={() => followAuthor(p.user_id)}>
                    <Text style={styles.followText}>Follow</Text>
                  </Pressable>
                ) : null}
              </View>
              {p.image_url ? (
                <Image source={{ uri: p.image_url }} style={styles.postImg} />
              ) : null}
              {p.caption ? <Text style={styles.caption}>{p.caption}</Text> : null}
              {p.tagged_users.length > 0 ? (
                <Text style={styles.tags}>
                  With {p.tagged_users.map((t) => t.name).join(', ')}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Pressable style={styles.actionBtn} onPress={() => toggleLike(p)}>
                  <Feather
                    name="heart"
                    size={20}
                    color={p.liked_by_me ? colors.danger : colors.textSecondary}
                    style={p.liked_by_me ? styles.heartFilled : undefined}
                  />
                  <Text style={[styles.actionText, p.liked_by_me && styles.actionTextActive]}>
                    {p.like_count}
                  </Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => toggleComments(p.id)}>
                  <Feather name="message-square" size={20} color={colors.textSecondary} />
                  <Text style={styles.actionText}>{p.comment_count}</Text>
                </Pressable>
              </View>

              <Text style={styles.timeAgo}>{formatTimeAgo(p.created_at)}</Text>

              {isOpen ? (
                <>
                  <View style={styles.commentsBlock}>
                    {commentsLoading[p.id] && comments.length === 0 ? (
                      <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
                    ) : null}
                    {comments.length === 0 && !commentsLoading[p.id] ? (
                      <Text style={styles.noComments}>Be the first to comment.</Text>
                    ) : null}
                    {comments.map((c) => (
                      <View key={c.id} style={styles.commentRow}>
                        <Image
                          source={{
                            uri:
                              c.author?.photo_url ??
                              'https://picsum.photos/seed/c/40/40',
                          }}
                          style={styles.commentAvatar}
                        />
                        <View style={styles.commentBody}>
                          <Text style={styles.commentAuthor}>
                            {c.author?.name ?? 'Player'}
                          </Text>
                          <Text style={styles.commentText}>{c.body}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  <View style={styles.commentInputRow}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Add a comment…"
                      placeholderTextColor={colors.textSecondary}
                      value={commentDrafts[p.id] ?? ''}
                      onChangeText={(t) =>
                        setCommentDrafts((d) => ({ ...d, [p.id]: t }))
                      }
                      multiline
                    />
                    <Pressable
                      style={[
                        buttonStyles.iconCircle,
                        !(commentDrafts[p.id] ?? '').trim() && styles.commentSendOff,
                      ]}
                      onPress={() => submitComment(p.id)}
                      disabled={!(commentDrafts[p.id] ?? '').trim()}
                    >
                      <Feather name="send" size={16} color={colors.primarySoft} />
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          );
        }}
      />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  addBtn: { padding: 8 },
  addBtnPressed: { opacity: 0.55 },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  accentStripe: { height: 3, width: '100%' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border },
  author: { fontWeight: '700', fontSize: 16, color: colors.text },
  meta: { color: colors.textSecondary, fontSize: 13, textTransform: 'capitalize' },
  followPill: {
    borderWidth: 1,
    borderColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  followText: { color: colors.primarySoft, fontWeight: '600', fontSize: 13 },
  postImg: { width: '100%', height: 200, backgroundColor: colors.border },
  caption: { paddingHorizontal: 12, paddingTop: 8, fontSize: 16, color: colors.text },
  tags: { paddingHorizontal: 12, color: colors.primaryMuted, marginTop: 4, fontSize: 14 },
  actions: {
    flexDirection: 'row',
    gap: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  actionTextActive: { color: colors.danger },
  heartFilled: { textShadowColor: colors.danger },
  timeAgo: {
    paddingHorizontal: 12,
    paddingBottom: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  commentsBlock: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  noComments: { color: colors.textSecondary, fontSize: 13, paddingVertical: 8 },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 10,
  },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.border },
  commentBody: { flex: 1 },
  commentAuthor: { fontWeight: '700', fontSize: 13, color: colors.text },
  commentText: { color: colors.text, fontSize: 14, marginTop: 2 },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    minHeight: 36,
    maxHeight: 120,
  },
  commentSendOff: { opacity: 0.4 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
});
