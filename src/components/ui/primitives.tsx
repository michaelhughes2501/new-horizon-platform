// src/components/ui/primitives.tsx
// Shared inline-styled UI primitives. Import via @components/ui.
import React, { ReactNode, CSSProperties } from 'react';
import { C, fonts, avatarColors } from '@styles/tokens';

// ── Button ────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled = false,
  fullWidth = false,
  size = 'md',
  style,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
}) {
  const pad = size === 'sm' ? '7px 14px' : size === 'lg' ? '14px 28px' : '10px 20px';
  const fontSize = size === 'sm' ? 13 : 14;

  const base: CSSProperties = {
    padding: pad,
    fontSize,
    fontFamily: fonts.body,
    fontWeight: 500,
    borderRadius: 10,
    width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'transform .12s ease, filter .12s ease',
    border: '1px solid transparent',
  };

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary:   { background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white },
    secondary: { background: C.white, color: C.charcoal, borderColor: C.mist },
    ghost:     { background: 'transparent', color: C.slate },
    danger:    { background: C.rose, color: C.white },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = 'brightness(1.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
    >
      {children}
    </button>
  );
}

// ── Avatar ────────────────────────────────────────────────────
export function Avatar({
  initials,
  size = 40,
}: {
  initials: string;
  size?: number;
}) {
  const txt = (initials || '?').slice(0, 2).toUpperCase();
  const bg = avatarColors[txt] ?? C.gold;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: C.white,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: size * 0.38,
        flexShrink: 0,
        fontFamily: fonts.body,
      }}
    >
      {txt}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({
  children,
  color = C.gold,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 9px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 500,
        background: `${color}1A`,
        color,
      }}
    >
      {children}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `3px solid ${C.mist}`,
        borderTopColor: C.gold,
        animation: 'spin .8s linear infinite',
      }}
    />
  );
}

// ── Card ──────────────────────────────────────────────────────
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.mist}`,
        borderRadius: 16,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(28,28,30,.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.white,
          borderRadius: 18,
          width: '100%',
          maxWidth: 480,
          maxHeight: '88vh',
          overflowY: 'auto',
          animation: 'fadeIn .2s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: `1px solid ${C.mist}`,
          }}
        >
          <h3 style={{ fontFamily: fonts.display, fontSize: 21, color: C.charcoal }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ fontSize: 22, color: C.slate, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({
  icon = '✦',
  title,
  text,
}: {
  icon?: string;
  title: string;
  text?: string;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 20px', color: C.slate }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: fonts.display, fontSize: 20, color: C.charcoal, marginBottom: 6 }}>
        {title}
      </div>
      {text && <div style={{ fontSize: 13, maxWidth: 360, margin: '0 auto' }}>{text}</div>}
    </div>
  );
}

// ── Page header ───────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 32, color: C.charcoal, fontWeight: 600 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: C.slate, fontSize: 14, marginTop: 4 }}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ── Text input ────────────────────────────────────────────────
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 500,
          color: C.slate,
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 10,
  border: `1px solid ${C.mist}`,
  background: C.ivory,
  color: C.charcoal,
  outline: 'none',
};
