// src/components/ui/primitives.tsx
// Shared inline-styled UI primitives. Import via @components/ui.
import React, { ReactNode, CSSProperties, useState } from 'react';
import { C, fonts, avatarColors, shadows, radii } from '@styles/tokens';
import { inputStyle, focusRingStyle, blurRingStyle } from './inputStyles';

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
    borderRadius: radii.md,
    width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'transform .12s ease, filter .12s ease, box-shadow .12s ease',
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
      onMouseEnter={e => {
        if (disabled) return;
        e.currentTarget.style.filter = 'brightness(1.06)';
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = shadows.sm;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter = 'none';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow =
          document.activeElement === e.currentTarget ? `0 0 0 3px ${C.gold}33` : 'none';
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(0)'; }}
      onFocus={e => { if (!disabled) e.currentTarget.style.boxShadow = `0 0 0 3px ${C.gold}33`; }}
      onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
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
        borderRadius: radii.full,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.6,
        background: `${color}1A`,
        color,
        whiteSpace: 'nowrap',
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
  hoverable = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  children: ReactNode;
  style?: CSSProperties;
  /** Lift + shadow on hover — use for cards that sit inside a Link/button. */
  hoverable?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      // Compose the caller's handlers with the internal hover tracking, so a
      // consumer-supplied onMouseEnter/onMouseLeave is still invoked.
      onMouseEnter={(e) => {
        if (hoverable) setIsHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (hoverable) setIsHovered(false);
        onMouseLeave?.(e);
      }}
      style={{
        background: C.white,
        border: `1px solid ${C.mist}`,
        borderRadius: radii.xl,
        padding: 20,
        boxShadow: hoverable && isHovered ? shadows.lg : shadows.sm,
        transform: hoverable && isHovered ? 'translateY(-2px)' : 'none',
        borderColor: hoverable && isHovered ? C.gold : C.mist,
        transition: 'transform .15s ease, box-shadow .15s ease, border-color .15s ease',
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
        animation: 'fadeIn .15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.white,
          borderRadius: radii['2xl'],
          width: '100%',
          maxWidth: 480,
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: shadows['2xl'],
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
            aria-label="Close"
            style={{
              fontSize: 22,
              color: C.slate,
              lineHeight: 1,
              padding: 6,
              borderRadius: radii.full,
              transition: 'background .12s ease, color .12s ease',
              outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.cream; e.currentTarget.style.color = C.charcoal; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.slate; }}
            onFocus={e => { e.currentTarget.style.background = C.cream; e.currentTarget.style.color = C.charcoal; }}
            onBlur={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.slate; }}
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

// ── TextInput / TextArea ─────────────────────────────────────────
// Same visual language as `inputStyle`, with a built-in gold focus ring —
// prefer these over a raw `<input style={inputStyle}>` in new form code.
type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> & {
  style?: CSSProperties;
};

export function TextInput({ style, onFocus, onBlur, ...rest }: TextInputProps) {
  return (
    <input
      style={{ ...inputStyle, ...style }}
      onFocus={e => { Object.assign(e.currentTarget.style, focusRingStyle); onFocus?.(e); }}
      onBlur={e => { Object.assign(e.currentTarget.style, blurRingStyle); onBlur?.(e); }}
      {...rest}
    />
  );
}

type TextAreaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'style'> & {
  style?: CSSProperties;
};

export function TextArea({ style, onFocus, onBlur, ...rest }: TextAreaProps) {
  return (
    <textarea
      style={{ ...inputStyle, minHeight: 90, resize: 'vertical', ...style }}
      onFocus={e => { Object.assign(e.currentTarget.style, focusRingStyle); onFocus?.(e); }}
      onBlur={e => { Object.assign(e.currentTarget.style, blurRingStyle); onBlur?.(e); }}
      {...rest}
    />
  );
}
