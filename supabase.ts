import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) console.warn('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');

const SecureStoreAdapter = {
  getItem: (keyName: string) => SecureStore.getItemAsync(keyName),
  setItem: (keyName: string, value: string) => SecureStore.setItemAsync(keyName, value),
  removeItem: (keyName: string) => SecureStore.deleteItemAsync(keyName),
};

export const supabase = createClient(url ?? 'https://example.supabase.co', key ?? 'missing-key', {
  auth: { storage: SecureStoreAdapter, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
