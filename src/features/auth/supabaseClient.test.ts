import { describe, expect, it } from 'vitest';
import { supabaseAuthOptions } from './supabaseClient';

describe('Supabaseクライアント設定', () => {
  it('PKCEとセッション永続化を有効にする', () => {
    expect(supabaseAuthOptions).toEqual({
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    });
  });
});
