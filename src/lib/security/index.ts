// src/lib/security/index.ts
// ─────────────────────────────────────────────────────────────
// Security utilities. Always import from here.
// Production: replace hash/sign helpers with Web Crypto API.
// ─────────────────────────────────────────────────────────────

// ── Hash (FNV-1a — deterministic, not cryptographic) ─────────
// In production use: await crypto.subtle.digest('SHA-256', data)
export const hash = (str: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (Math.imul(h, 0x01000193) >>> 0);
  }
  return h.toString(16).padStart(8, '0');
};

// ── Password hashing ──────────────────────────────────────────
// Production: use bcrypt via Edge Function, never client-side.
export const genSalt    = (): string => Math.random().toString(36).slice(2, 18);
export const hashPw     = (pw: string, salt: string): string =>
  hash(salt + pw + 'nh_secret_2025');

// ── JWT-style tokens ──────────────────────────────────────────
// Production: Supabase handles this automatically.
export interface TokenPayload {
  sub: string;
  email: string;
  exp: number;
  [key: string]: unknown;
}

export const signToken = (payload: TokenPayload): string => {
  const b64 = btoa(JSON.stringify(payload));
  const sig  = hash(b64 + 'nh_jwt_secret');
  return `${b64}.${sig}`;
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const [b64, sig] = token.split('.');
    if (hash(b64 + 'nh_jwt_secret') !== sig) return null;
    const payload = JSON.parse(atob(b64)) as TokenPayload;
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
};

// ── Session storage (sessionStorage, NOT localStorage) ────────
const SESSION_KEY = 'nh_session_v2';

export const storeSession = (userId: string, token: string): void => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      userId, token, ts: Date.now(),
    }));
  } catch (_) { /* storage unavailable */ }
};

export const loadSession = (): { userId: string; token: string } | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { userId: string; token: string; ts: number };
    // 30-day max session
    if (Date.now() - s.ts > 30 * 24 * 60 * 60 * 1000) {
      clearSession();
      return null;
    }
    return s;
  } catch { return null; }
};

export const clearSession = (): void => {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (_) { /* ignore */ }
};

// ── Input sanitisation ────────────────────────────────────────
export const sanitise = (input: unknown, maxLength = 2000): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/javascript:/gi, '')       // strip JS URIs
    .replace(/on\w+\s*=/gi, '')         // strip inline event handlers
    .replace(/\0/g, '')                 // strip null bytes
    .replace(/\s+/g, ' ')              // normalise whitespace
    .trim()
    .slice(0, maxLength);
};

// ── Email validation ──────────────────────────────────────────
export const isValidEmail = (email: string): boolean =>
  /^[a-zA-Z0-9._%+\-]{1,64}@[a-zA-Z0-9.\-]{1,253}\.[a-zA-Z]{2,}$/.test(
    (email || '').trim()
  );

// ── Password strength ─────────────────────────────────────────
export interface PwStrength {
  score:  0 | 1 | 2 | 3 | 4;
  label:  'Weak' | 'Fair' | 'Good' | 'Strong';
  color:  string;
  tips:   string[];
}

export const checkPwStrength = (pw: string): PwStrength => {
  const tips: string[] = [];
  let score = 0;
  if (pw.length >= 8)                score++; else tips.push('At least 8 characters');
  if (pw.length >= 12)               score++;
  if (/[A-Z]/.test(pw))             score++; else tips.push('One uppercase letter');
  if (/[0-9]/.test(pw))             score++; else tips.push('One number');
  if (/[^a-zA-Z0-9]/.test(pw))      score++; else tips.push('One symbol (!@#$%^&*)');

  const common = ['password','123456','qwerty','letmein','welcome','monkey'];
  if (common.includes(pw.toLowerCase())) return {
    score: 0, label: 'Weak', color: '#C62828',
    tips: ['This password is too common — choose something unique'],
  };

  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const labels:   PwStrength['label'][] = ['Weak','Weak','Fair','Good','Strong'];
  const colors = ['#C62828','#C62828','#E65100','#7A6530','#3D7A5F'];

  return { score: clamped, label: labels[clamped], color: colors[clamped], tips };
};

// ── Client-side rate limiting (sliding window) ─────────────────
const _windows: Record<string, number[]> = {};

export const rateCheck = (
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; resetIn: number } => {
  const now = Date.now();
  _windows[key] = (_windows[key] ?? []).filter(t => now - t < windowMs);
  if (_windows[key].length >= limit) {
    const resetIn = Math.ceil((windowMs - (now - (_windows[key][0] ?? 0))) / 1000);
    return { ok: false, resetIn };
  }
  _windows[key].push(now);
  return { ok: true, resetIn: 0 };
};

// Pre-defined rate limits
export const RATE_LIMITS = {
  login:        { limit: 5,  windowMs: 15 * 60 * 1000 },
  register:     { limit: 3,  windowMs: 60 * 60 * 1000 },
  message:      { limit: 30, windowMs: 60 * 1000 },
  jobApply:     { limit: 5,  windowMs: 24 * 60 * 60 * 1000 },
  like:         { limit: 50, windowMs: 60 * 60 * 1000 },
  comment:      { limit: 10, windowMs: 60 * 60 * 1000 },
  report:       { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
  profileUpdate:{ limit: 10, windowMs: 60 * 60 * 1000 },
  passwordReset:{ limit: 3,  windowMs: 60 * 60 * 1000 },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

export const checkLimit = (
  action: RateLimitAction,
  identifier: string
): { ok: boolean; message?: string } => {
  const cfg = RATE_LIMITS[action];
  const res = rateCheck(`${action}:${identifier}`, cfg.limit, cfg.windowMs);
  if (!res.ok) {
    const min = Math.ceil(res.resetIn / 60);
    const messages: Record<RateLimitAction, string> = {
      login:         `Too many login attempts. Try again in ${min} min.`,
      register:      `Account creation limit reached. Try in ${min} min.`,
      message:       `You're sending messages too fast. Please slow down.`,
      jobApply:      `Daily application limit reached (5/day). Try tomorrow.`,
      like:          `You're liking too many profiles. Try again in ${min} min.`,
      comment:       `Comment limit reached. Try again in ${min} min.`,
      report:        `Report limit reached for today.`,
      profileUpdate: `Too many profile updates. Wait a moment.`,
      passwordReset: `Password reset limit. Try again in ${min} min.`,
    };
    return { ok: false, message: messages[action] };
  }
  return { ok: true };
};

// ── Content moderation ────────────────────────────────────────
const BLOCKED_TERMS = [
  'scam', 'click here for free', 'wire transfer', 'bitcoin address',
  'western union', 'moneygram', 'send me your money', 'nigerian prince',
];

const THREAT_PATTERNS = [
  /i (will|gonna|going to) (kill|hurt|find|come for) you/i,
  /i know where you live/i,
  /you('ll| will) regret (this|it)/i,
];

export interface ModerationResult {
  ok:     boolean;
  flags:  string[];
  action: 'allow' | 'warn' | 'block';
}

export const moderateContent = (text: string): ModerationResult => {
  const lower = text.toLowerCase();
  const flags: string[] = [];

  BLOCKED_TERMS.forEach(term => {
    if (lower.includes(term)) flags.push(`Blocked term: "${term}"`);
  });
  THREAT_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) flags.push('Threatening language detected');
  });

  // PII patterns
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text))
    flags.push('Possible SSN detected');
  if (/\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/.test(text))
    flags.push('Possible credit card number detected');

  const action =
    flags.some(f => f.includes('Threatening')) ? 'block' :
    flags.length > 0                           ? 'warn'  :
    'allow';

  return { ok: flags.length === 0, flags, action };
};

// ── PII scrubber ──────────────────────────────────────────────
export const scrubPII = (text: string): string =>
  text
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN REDACTED]')
    .replace(/\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g, '[CARD REDACTED]');

// ── URL safety check ──────────────────────────────────────────
export const isSafeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'tel:', 'mailto:'].includes(parsed.protocol);
  } catch { return false; }
};

// ── Audit log ─────────────────────────────────────────────────
export type SecurityEventType =
  | 'LOGIN_SUCCESS' | 'LOGIN_FAIL' | 'LOGOUT'
  | 'SIGNUP' | 'ACCOUNT_LOCKED'
  | 'PASSWORD_CHANGED' | 'PASSWORD_FAIL'
  | 'PROFILE_UPDATE' | 'RATE_LIMIT'
  | 'MSG_BLOCKED' | 'COMMENT_FLAGGED'
  | 'XSS_ATTEMPT' | 'INJECT_ATTEMPT'
  | 'BANNED' | 'REPORTED';

interface AuditEntry {
  event:     SecurityEventType;
  userId?:   string;
  details:   Record<string, unknown>;
  ts:        string;
  userAgent: string;
}

const _log: AuditEntry[] = [];

export const audit = (
  event:    SecurityEventType,
  userId?:  string,
  details:  Record<string, unknown> = {}
): void => {
  const entry: AuditEntry = {
    event, userId, details,
    ts:        new Date().toISOString(),
    userAgent: navigator.userAgent.slice(0, 100),
  };
  _log.push(entry);
  if (_log.length > 200) _log.shift();

  const critical: SecurityEventType[] = [
    'ACCOUNT_LOCKED','XSS_ATTEMPT','INJECT_ATTEMPT','BANNED',
  ];
  if (critical.includes(event)) {
    console.warn('[SECURITY]', event, { userId, ...details });
  }

  // In production, also send to Supabase:
  // supabase.from('security_events').insert({ user_id: userId, event_type: event, details })
};

export const getAuditLog = (): AuditEntry[] => [..._log];

// ── CSP meta tag injection ────────────────────────────────────
export const applyCSP = (): void => {
  if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = [
    "default-src 'self' https:",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  ].join('; ');
  document.head.appendChild(meta);
};

// ── CSRF token ────────────────────────────────────────────────
export const csrfToken = (): string =>
  hash(`${Date.now()}${navigator.userAgent}${Math.random()}`);

// ── Default export ────────────────────────────────────────────
const Security = {
  hash, genSalt, hashPw,
  signToken, verifyToken,
  storeSession, loadSession, clearSession,
  sanitise, isValidEmail, checkPwStrength,
  rateCheck, checkLimit, RATE_LIMITS,
  moderateContent, scrubPII, isSafeUrl,
  audit, getAuditLog,
  applyCSP, csrfToken,
};

export default Security;
