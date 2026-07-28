// src/components/layout/AppLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { C } from '@styles/tokens';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

// Note: AIChatbot (src/components/AIChatbot.tsx) was harvested from a different
// project (ConvictConnect1) and was never adapted to this stack — it uses
// Tailwind classNames (not installed here) and posts to a /api/chat endpoint
// that doesn't exist in this Supabase-backed app, so it rendered unstyled and
// non-functional on every authenticated page. Removed pending a real rewrite
// against src/lib/api/ + design tokens.

export default function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.ivory }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar />
        <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1200, width: '100%' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
