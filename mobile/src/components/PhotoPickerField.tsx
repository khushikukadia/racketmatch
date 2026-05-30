import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  avatarStoragePath,
  pickImageFromLibrary,
  postImageStoragePath,
  STORAGE_BUCKETS,
  uploadImageFromUri,
} from '../lib/imageUpload';
import { colors } from '../theme/colors';

type Variant = 'avatar' | 'post';

type Props = {
  variant: Variant;
  value: string | null;
  onChange: (url: string | null) => void;
  style?: StyleProp<ViewStyle>;
};

export function PhotoPickerField({ variant, value, onChange, style }: Props) {
  const { userId, canUseCloudStorage } = useAuth();
  const [busy, setBusy] = useState(false);

  const isAvatar = variant === 'avatar';

  const onPick = async () => {
    if (!userId) {
      Alert.alert('Not signed in', 'Sign in to upload photos.');
      return;
    }
    if (!canUseCloudStorage) {
      Alert.alert(
        'Sign in required',
        'Photo uploads use your Supabase account. Log in with email and password (not dev mock login).'
      );
      return;
    }

    setBusy(true);
    try {
      const asset = await pickImageFromLibrary({
        aspect: isAvatar ? [1, 1] : [4, 3],
        allowsEditing: true,
      });
      if (!asset) return;

      const path = isAvatar
        ? avatarStoragePath(userId, asset.mimeType ?? undefined)
        : postImageStoragePath(userId, asset.mimeType ?? undefined);

      const bucket = isAvatar ? STORAGE_BUCKETS.avatars : STORAGE_BUCKETS.postImages;
      const publicUrl = await uploadImageFromUri(
        bucket,
        path,
        asset.uri,
        asset.mimeType ?? 'image/jpeg'
      );
      onChange(publicUrl);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload image');
    } finally {
      setBusy(false);
    }
  };

  const onRemove = () => {
    if (busy) return;
    onChange(null);
  };

  return (
    <View style={[styles.wrap, style]}>
      {value ? (
        <Image
          source={{ uri: value }}
          style={isAvatar ? styles.avatarPreview : styles.postPreview}
        />
      ) : (
        <View style={isAvatar ? styles.avatarPlaceholder : styles.postPlaceholder}>
          <Text style={styles.placeholderIcon}>{isAvatar ? '👤' : '📷'}</Text>
        </View>
      )}
      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, busy && styles.btnDisabled]}
          onPress={onPick}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.btnText}>{value ? 'Change photo' : 'Choose from library'}</Text>
          )}
        </Pressable>
        {value ? (
          <Pressable style={styles.removeBtn} onPress={onRemove} disabled={busy}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
      {!canUseCloudStorage ? (
        <Text style={styles.hint}>
          Uploads require a real account login. Turn off EXPO_PUBLIC_DEV_MOCK_AUTH for production.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12 },
  avatarPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.border,
  },
  postPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: { fontSize: 36 },
  actions: { alignSelf: 'stretch', gap: 8 },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  removeBtn: { alignItems: 'center', paddingVertical: 6 },
  removeText: { color: colors.textSecondary, fontSize: 14 },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
