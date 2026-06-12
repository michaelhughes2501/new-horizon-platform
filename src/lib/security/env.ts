/**
 * Environment validation
 * Ensures all required environment variables are present and valid
 */

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appUrl: string;
  internalSecret: string;
  vapidPublicKey?: string;
  nodeEnv: 'development' | 'production' | 'test';
}

export function validateEnv(): EnvConfig {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_APP_URL',
    'VITE_INTERNAL_SECRET',
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Copy .env.example to .env.local and fill in your values.`
    );
  }

  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    appUrl: import.meta.env.VITE_APP_URL,
    internalSecret: import.meta.env.VITE_INTERNAL_SECRET,
    vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
    nodeEnv: (import.meta.env.MODE || 'development') as any,
  };
}

export default validateEnv();
