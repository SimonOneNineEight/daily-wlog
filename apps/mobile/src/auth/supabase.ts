import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Auth-only Supabase client. Everything else goes through the API
// (ADR-0002); the app talks to Supabase solely to obtain and refresh the
// session whose access token the API verifies. Defaults are the local
// Supabase demo values; real builds set the EXPO_PUBLIC_ env vars.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321';
const publishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

export const supabase = createClient(url, publishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
