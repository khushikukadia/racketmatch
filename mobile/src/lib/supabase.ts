import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

let _client: SupabaseClient | null = null;

/**
 * Lazy-create the client so importing this module never runs native/bridge work
 * before the app registers (avoids "main" not registered on startup).
 */
export function getSupabase(): SupabaseClient {
  if (!_client) {
    const isWeb = Platform.OS === 'web';
    _client = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      {
        auth: {
          ...(isWeb ? {} : { storage: AsyncStorage }),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: isWeb,
        },
      }
    );
  }
  return _client;
}
