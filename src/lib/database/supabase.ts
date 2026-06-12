// src/lib/database/supabase.ts
// ─────────────────────────────────────────────────────────────
// Supabase client singleton + typed query helpers.
// All database access goes through this file.
// ─────────────────────────────────────────────────────────────
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Copy .env.example → .env.local and fill in your project values.'
  );
}

// ── Singleton client ──────────────────────────────────────────
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken:    true,
    persistSession:      true,
    detectSessionInUrl:  true,
    storageKey:          'nh_session',
    storage:             sessionStorage as Storage,   // sessionStorage > localStorage for security
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
  global: {
    headers: { 'X-Client': 'new-horizon-web' },
  },
});

// ── Realtime helpers ──────────────────────────────────────────

/**
 * Subscribe to new messages in a conversation.
 * Returns a cleanup function — call it on component unmount.
 *
 * Supabase Realtime must be enabled for the `messages` table.
 * Dashboard → Database → Replication → Add table → messages
 */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (msg: Record<string, unknown>) => void
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      payload => onMessage(payload.new as Record<string, unknown>)
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/**
 * Subscribe to new notifications for a user.
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notif: Record<string, unknown>) => void
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      },
      payload => onNotification(payload.new as Record<string, unknown>)
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/**
 * Subscribe to connection changes (accepted/new).
 */
export function subscribeToConnections(
  userId: string,
  onChange: () => void
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`connections:${userId}`)
    .on(
      'postgres_changes',
      {
        event:  '*',
        schema: 'public',
        table:  'connections',
      },
      onChange
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── Storage helpers ───────────────────────────────────────────

/** Upload a user avatar. Returns the public URL. */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const ext  = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

// ── Query helpers ─────────────────────────────────────────────

/** Fetch a single row, returns null if not found. */
export async function fetchOne<T>(
  table: string,
  match: Record<string, unknown>
): Promise<T | null> {
  const query = Object.entries(match).reduce(
    (q, [k, v]) => q.eq(k, v),
    supabase.from(table).select('*').limit(1)
  );
  const { data, error } = await query.maybeSingle();
  if (error) { console.error(`fetchOne(${table}):`, error.message); return null; }
  return data as T | null;
}

/** Fetch many rows with optional filters. */
export async function fetchMany<T>(
  table: string,
  match: Record<string, unknown> = {},
  options: { order?: string; ascending?: boolean; limit?: number } = {}
): Promise<T[]> {
  let query = supabase.from(table).select('*');
  Object.entries(match).forEach(([k, v]) => { query = query.eq(k, v as string); });
  if (options.order) {
    query = query.order(options.order, { ascending: options.ascending ?? false });
  }
  if (options.limit) { query = query.limit(options.limit); }
  const { data, error } = await query;
  if (error) { console.error(`fetchMany(${table}):`, error.message); return []; }
  return (data as T[]) ?? [];
}

export default supabase;
