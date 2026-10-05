import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface AuthConfiguration {
  isConfigured: boolean;
}

export const supabaseAuthOptions = {
  storageKey: 'sc-dojo:auth-session',
  flowType: 'pkce',
  detectSessionInUrl: true,
  persistSession: true,
  autoRefreshToken: true,
} as const;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

let client: SupabaseClient | undefined;

if (
  supabaseUrl !== undefined &&
  supabaseUrl !== '' &&
  supabasePublishableKey !== undefined &&
  supabasePublishableKey !== ''
) {
  try {
    client = createClient(supabaseUrl, supabasePublishableKey, {
      auth: supabaseAuthOptions,
    });
  } catch {
    // Invalid or absent deployment configuration must not prevent local learning.
    client = undefined;
  }
}

/**
 * The only Supabase client used by the application. It is intentionally absent
 * when the public browser configuration has not been supplied.
 */
export const supabaseClient = client;

export const authConfiguration: AuthConfiguration = {
  isConfigured: supabaseClient !== undefined,
};
