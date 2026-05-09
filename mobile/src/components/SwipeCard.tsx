import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { DiscoverProfile } from '../api/types';
import { colors, sportAccent } from '../theme/colors';

type Props = {
  profile: DiscoverProfile;
  onSwipe: (direction: 'like' | 'pass') => void;
  disabled?: boolean;
};

export function SwipeCard({ profile, onSwipe, disabled }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const swoosh = useSharedValue(0);

  const primarySport = profile.sports[0]?.sport ?? 'tennis';
  const accent = useMemo(() => sportAccent(primarySport), [primarySport]);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.2;
      swoosh.value = Math.min(1, Math.abs(e.translationX) / 180);
    })
    .onEnd((e) => {
      const dx = e.translationX;
      if (Math.abs(dx) > 100) {
        const dir = dx > 0 ? 'like' : 'pass';
        const targetX = dx > 0 ? 420 : -420;
        translateX.value = withSpring(targetX, { damping: 14, stiffness: 120 }, (finished) => {
          if (finished) {
            runOnJS(onSwipe)(dir);
          }
        });
        swoosh.value = withTiming(1, { duration: 220 });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        swoosh.value = withTiming(0, { duration: 150 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${interpolate(translateX.value, [-200, 0, 200], [-12, 0, 12])}deg` },
    ],
  }));

  const swooshStyle = useAnimatedStyle(() => ({
    opacity: swoosh.value * 0.35,
    transform: [{ scale: interpolate(swoosh.value, [0, 1], [0.85, 1.25]) }],
  }));

  const times = profile.sports
    .flatMap((s) => s.preferred_times ?? [])
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');
  const courts = profile.sports
    .flatMap((s) => s.preferred_locations ?? [])
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.cardWrap, cardStyle]}>
        <Image
          source={{
            uri: profile.photo_url ?? 'https://picsum.photos/seed/placeholder/400/500',
          }}
          style={styles.photo}
        />
        <View style={styles.gradient} pointerEvents="none" />
        <View style={[styles.accentBar, { backgroundColor: accent.secondary }]} />
        <Animated.View
          pointerEvents="none"
          style={[styles.swoosh, { backgroundColor: accent.primary }, swooshStyle]}
        />
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name}
            </Text>
            <View style={[styles.scoreBadge, { backgroundColor: accent.primary }]}>
              <Text style={styles.scoreText}>{profile.compatibility_score}%</Text>
            </View>
          </View>
          {profile.city ? <Text style={styles.meta}>{profile.city}</Text> : null}
          {profile.match_reasons.length > 0 ? (
            <Text style={styles.reasons} numberOfLines={2}>
              {profile.match_reasons.join(' · ')}
            </Text>
          ) : null}
          <View style={styles.sportRow}>
            {profile.sports.map((s) => (
              <View
                key={s.id}
                style={[styles.chip, { borderColor: sportAccent(s.sport).primary }]}
              >
                <Text style={styles.chipText}>
                  {s.sport} · {s.skill_level}
                </Text>
              </View>
            ))}
          </View>
          {times ? (
            <Text style={styles.small} numberOfLines={1}>
              <Text style={styles.smallLabel}>Times: </Text>
              {times}
            </Text>
          ) : null}
          {courts ? (
            <Text style={styles.small} numberOfLines={1}>
              <Text style={styles.smallLabel}>Courts: </Text>
              {courts}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: colors.white,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  swoosh: {
    position: 'absolute',
    right: 24,
    top: 120,
    width: 56,
    height: 56,
    borderRadius: 28,
    zIndex: 2,
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: colors.border,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 240,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  body: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  meta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
  },
  reasons: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  sportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  chipText: {
    fontSize: 12,
    color: colors.text,
    textTransform: 'capitalize',
  },
  small: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
  },
  smallLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
});
