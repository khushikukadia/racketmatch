import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { getSupabase } from './supabase';

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  postImages: 'post-images',
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export function storageUnavailableMessage(): string {
  return 'Photo uploads require signing in with email and password. Dev mock login cannot upload to cloud storage.';
}

export async function assertStorageSession(): Promise<void> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  const token = data.session?.access_token;
  if (!token || token === 'mock') {
    throw new Error(storageUnavailableMessage());
  }
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error('Could not read the selected image.');
  }
  return res.arrayBuffer();
}

function extensionForMime(mimeType: string | undefined): string {
  if (!mimeType) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('heic') || mimeType.includes('heif')) return 'jpg';
  return 'jpg';
}

export async function pickImageFromLibrary(options?: {
  aspect?: [number, number];
  allowsEditing?: boolean;
}): Promise<ImagePicker.ImagePickerAsset | null> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      throw new Error('Allow photo library access to choose an image.');
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options?.allowsEditing ?? true,
    aspect: options?.aspect,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }
  return result.assets[0];
}

export async function uploadImageFromUri(
  bucket: StorageBucket,
  storagePath: string,
  uri: string,
  mimeType?: string
): Promise<string> {
  await assertStorageSession();

  const contentType = mimeType ?? 'image/jpeg';
  const buffer = await uriToArrayBuffer(uri);

  const supabase = getSupabase();
  const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

export function avatarStoragePath(userId: string, mimeType?: string): string {
  const ext = extensionForMime(mimeType);
  return `${userId}/avatar-${Date.now()}.${ext}`;
}

export function postImageStoragePath(userId: string, mimeType?: string): string {
  const ext = extensionForMime(mimeType);
  return `${userId}/post-${Date.now()}.${ext}`;
}
