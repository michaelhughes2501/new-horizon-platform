// src/components/pages/AdminPage.tsx
import React from 'react';
import { C, fonts } from '@styles/tokens';
import { useAuth } from '@context/AuthContext';
import { Card, PageHeader, Badge, EmptyState } from '@components/ui';

const STATS = [
  { label: 'Members',       value: '—', icon: '✦' },
  { label: 'Messages sent', value: '—', icon: '✉' },
  { label: 'Active jobs',   value: '—', icon: '⬢' },
  { label: 'Open reports',  value: '—', icon: '⚑' },
];

export default function AdminPage() {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', background: C.ivory, padding: '28px 32px' }}>
      <PageHeader
        title="Admin"
        subtitle="Platform moderation and oversight"
        action={<Badge color={C.gold}>{user?.role ?? 'admin'}</Badge>}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {STATS.map(s => (
          <Card key={s.label}>
            <div style={{ fontSize: 22, marginBottom: 8, color: C.gold }}>{s.icon}</div>
            <div style={{ fontFamily: fonts.display, fontSize: 30, color: C.charcoal }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: C.slate }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <EmptyState
          icon="⚙"
          title="Connect Supabase to load admin data"
          text="Member accounts, reports, and audit logs appear here once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY point at a live project."
        />
      </Card>
    </div>
  );
}
