// src/components/ui/Toast.tsx
import React from 'react';
import { C } from '@styles/tokens';
import type { ToastMessage, ToastType } from '@types/app';

const STYLE: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: C.success, icon: '✓' },
  error:   { bg: C.rose,    icon: '!' },
  info:    { bg: C.info,    icon: 'i' },
  warn:    { bg: C.warn,    icon: '!' },
};

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 360,
      }}
    >
      {toasts.map(t => {
        const s = STYLE[t.type] ?? STYLE.info;
        return (
          <div
            key={t.id}
            onClick={() => onDismiss(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: C.white,
              borderRadius: 12,
              padding: '12px 14px',
              boxShadow: '0 8px 24px rgba(0,0,0,.14)',
              borderLeft: `4px solid ${s.bg}`,
              cursor: 'pointer',
              animation: 'slideIn .25s ease',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: s.bg,
                color: C.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div style={{ fontSize: 13, color: C.charcoal, flex: 1 }}>{t.msg}</div>
          </div>
        );
      })}
    </div>
  );
}

export default ToastStack;
