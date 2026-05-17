// src/components/pages/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { C, fonts } from '@styles/tokens';
import { Button } from '@components/ui';

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: C.ivory,
        textAlign: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 96,
          color: C.gold,
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        404
      </div>
      <h1 style={{ fontFamily: fonts.display, fontSize: 28, color: C.charcoal, margin: '8px 0 6px' }}>
        Page not found
      </h1>
      <p style={{ color: C.slate, fontSize: 14, marginBottom: 22 }}>
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Link to="/">
        <Button size="lg">Back to start</Button>
      </Link>
    </div>
  );
}
