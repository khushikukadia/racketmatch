import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../api/client';
import type { DiscoverProfile, Sport } from '../api/types';
import { AppBrand } from '../components/AppBrand';
import { colors } from '../theme/colors';

function MatchSplashTitle() {
  return (
    <View style={styles.matchTextWrap}>
      <Text style={styles.matchTitle}>It's a</Text>
      <Text style={styles.matchTitle}>match!</Text>
    </View>
  );
}

type SwipeCardProps = {
  profile: DiscoverProfile;
  mySports: Sport[];
  onSwipe: (direction: 'like' | 'pass') => void;
  disabled?: boolean;
};

export function DiscoverScreen() {
  const { apiToken, userId } = useAuth();
  const [queue, setQueue] = useState<DiscoverProfile[]>([]);
  const [mySports, setMySports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [matchSplash, setMatchSplash] = useState(false);
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
      const [rows, sports] = await Promise.all([
        api.getDiscover(apiToken),
        userId
          ? api.getUserSports(apiToken, userId).then((s) => s.map((p) => p.sport))
          : Promise.resolve([] as Sport[]),
      ]);
      setQueue(rows);
      setMySports(sports);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [apiToken, userId]);

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
        setMatchSplash(true);
        setTimeout(() => setMatchSplash(false), 2000);
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
        <AppBrand size="sm" showName={false} />
      </View>
    );
  }

  if (!top) {
    return (
      <View style={styles.center}>
        <AppBrand size="sm" showName={false} style={styles.emptyLogo} />
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
        <AppBrand size="sm" showName={false} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {matchSplash ? (
        <View style={styles.matchOverlay}>
          <MatchSplashTitle />
        </View>
      ) : null}
      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
      <View style={styles.cardSlot}>
        <SwipeCard key={top.id} profile={top} mySports={mySports} onSwipe={onSwipe} disabled={busy} />
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
  like: { borderColor: colors.primarySoft, backgroundColor: colors.white },
  circleText: { fontWeight: '700', color: colors.textSecondary },
  likeText: { color: colors.primarySoft },
  emptyLogo: { marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptySub: { textAlign: 'center', color: colors.textSecondary, marginTop: 8 },
  reload: {
    marginTop: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  reloadText: { color: colors.primarySoft, fontWeight: '600' },
  matchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  matchTextWrap: {
    alignItems: 'center',
  },
  matchTitle: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 52,
  },
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
