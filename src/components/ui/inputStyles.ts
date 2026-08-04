// src/components/ui/inputStyles.ts
// Plain style-object constants shared by input-like primitives (TextInput, TextArea).
// Kept out of primitives.tsx so that file only exports components — mixing
// component and non-component exports in one file breaks Fast Refresh.
import type { CSSProperties } from 'react';
import { C, fonts, radii } from '@styles/tokens';

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: radii.md,
  border: `1px solid ${C.mist}`,
  background: C.ivory,
  color: C.charcoal,
  outline: 'none',
  fontFamily: fonts.body,
  transition: 'border-color .12s ease, box-shadow .12s ease',
};

// Apply alongside `inputStyle` (spread order matters — see components using it)
// via onFocus/onBlur handlers, e.g.:
//   onFocus={e => Object.assign(e.currentTarget.style, focusRingStyle)}
//   onBlur={e => Object.assign(e.currentTarget.style, blurRingStyle)}
export const focusRingStyle: CSSProperties = {
  borderColor: C.gold,
  boxShadow: `0 0 0 3px ${C.gold}26`,
};
export const blurRingStyle: CSSProperties = {
  borderColor: C.mist,
  boxShadow: 'none',
};
