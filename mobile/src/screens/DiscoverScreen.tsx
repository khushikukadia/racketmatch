import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../api/client';
import type { DiscoverProfile } from '../api/types';
import { colors } from '../theme/colors';

type SwipeCardProps = {
  profile: DiscoverProfile;
  onSwipe: (direction: 'like' | 'pass') => void;
  disabled?: boolean;
};

export function DiscoverScreen() {
  const { apiToken } = useAuth();
  const [queue, setQueue] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [SwipeCard, setSwipeCard] = useState<React.ComponentType<SwipeCardProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('../components/SwipeCard')
      .then((mod) => {
        if (!cancelled) {
          setSwipeCard(() => mod.SwipeCard);
        }
      })
      .catch((e) => console.warn('SwipeCard load failed', e));
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.getDiscover(apiToken);
      setQueue(rows);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [apiToken]);

  useEffect(() => {
    load();
  }, [load]);

  const top = queue[0];

  const onSwipe = async (direction: 'like' | 'pass') => {
    if (!top || busy) return;
    setBusy(true);
    try {
      const res = await api.postSwipe(apiToken, top.id, direction);
      if (res.matched) {
        setToast("It's a match!");
        setTimeout(() => setToast(null), 2000);
      }
      setQueue((q) => {
        const next = q.slice(1);
        if (next.length <= 3) {
          load();
        }
        return next;
      });
    } catch (e) {
      if (e instanceof ApiError) {
        setToast('Could not record swipe');
        setTimeout(() => setToast(null), 2000);
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading && !top) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!top) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>You're all caught up</Text>
        <Text style={styles.emptySub}>Check back later for new players nearby.</Text>
        <Pressable style={styles.reload} onPress={load}>
          <Text style={styles.reloadText}>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  if (!SwipeCard) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
      <View style={styles.cardSlot}>
        <SwipeCard key={top.id} profile={top} onSwipe={onSwipe} disabled={busy} />
      </View>
      <View style={styles.actions}>
        <Pressable style={[styles.circle, styles.pass]} onPress={() => onSwipe('pass')} disabled={busy}>
          <Text style={styles.circleText}>Pass</Text>
        </Pressable>
        <Pressable style={[styles.circle, styles.like]} onPress={() => onSwipe('like')} disabled={busy}>
          <Text style={[styles.circleText, styles.likeText]}>Like</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingTop: 6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  cardSlot: { flex: 1, paddingHorizontal: 12, paddingBottom: 6 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    paddingTop: 14,
    paddingBottom: 18,
  },
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  pass: { borderColor: colors.textSecondary, backgroundColor: colors.white },
  like: { borderColor: colors.primary, backgroundColor: colors.primary },
  circleText: { fontWeight: '700', color: colors.textSecondary },
  likeText: { color: colors.white },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptySub: { textAlign: 'center', color: colors.textSecondary, marginTop: 8 },
  reload: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  reloadText: { color: colors.white, fontWeight: '600' },
  toast: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: { color: colors.white, fontWeight: '700' },
});
